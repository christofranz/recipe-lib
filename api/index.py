import os
import datetime
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session, joinedload
from .recipe_scraper import scrape_jsonld
from .db_models import RecipeDB, RecipeImport, RecipeUpdate, Base, UserDB, UserCreate, CookbookDB
from .login_auth import verify_password, get_password_hash, create_access_token, SECRET_KEY, ALGORITHM


# --- 1. DATABASE CONFIGURATION ---

# Check if running on Vercel (Postgres) or Local (SQLite)
DATABASE_URL = os.getenv("POSTGRES_URL")

connect_args = {}

if DATABASE_URL:
    # Fix for SQLAlchemy: Vercel uses 'postgres://', SQLAlchemy needs 'postgresql://'
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Local Fallback
    DATABASE_URL = "sqlite:///./local_recipes.db"
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# --- 2. APP SETUP ---

app = FastAPI()

templates = Jinja2Templates(directory="templates")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# OAuth2 Schema
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")

# --- Dependency: Get Current User ---
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserDB).filter(UserDB.email == email).first()
    if user is None:
        raise credentials_exception
    
    # Check: Ist der User vom Admin approved?
    if not user.is_approved:
         raise HTTPException(status_code=400, detail="Account pending approval by admin.")
         
    return user

# --- AUTH ENDPUNKTE ---

@app.post("/api/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(UserDB).filter(UserDB.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    # is_approved ist standardmäßig False (siehe Model)
    new_user = UserDB(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    return {"msg": "User created. Please wait for admin approval."}

@app.post("/api/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    if not user.is_approved:
        raise HTTPException(status_code=400, detail="Account not yet approved.")

    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# --- 3. STARTUP EVENT (AUTO-SEEDING) ---
# This ensures the DB has data when you deploy it
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if DB is empty
    if db.query(RecipeDB).count() == 0:
        print("🌱 Seeding Database with Sample Recipe...")
        sample = RecipeDB(
            title="Spicy DB-Powered Shrimp",
            description="This recipe comes from a real database (SQLite locally, Postgres on Vercel)!",
            image_url="https://images.unsplash.com/photo-1565557623262-b51c2513a641?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80",
            ingredients_str="200g Shrimp|3 cloves Garlic|100g Pasta|1 tbsp Olive Oil",
            instructions="1. Connect to Database.\n2. Fetch Data.\n3. Render React.\n4. Click Bring Button.",
            owner_id=1
        )
        db.add(sample)
        db.commit()
    db.close()

# --- 4. ENDPOINTS ---
# Get all recipes
@app.get("/api/recipes")
def read_recipes(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    # only recipes of the logged in user
    recipes = db.query(RecipeDB).filter(RecipeDB.owner_id == current_user.id).all()
    return recipes

# Endpoint to get recipe detail including cookbooks
@app.get("/api/recipes/{recipe_id}")
def get_recipe_detail(
    recipe_id: int, 
    db: Session = Depends(get_db), 
    current_user: UserDB = Depends(get_current_user) # Neu hinzugefügt
):
    recipe = db.query(RecipeDB).options(joinedload(RecipeDB.cookbooks)).filter(
        RecipeDB.id == recipe_id,
        RecipeDB.owner_id == current_user.id # Sicherstellen, dass es dem User gehört
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found or access denied")
    return recipe


@app.get("/r/{recipe_uuid}", response_class=HTMLResponse)
def recipe_import_page(request: Request, recipe_uuid: str, db: Session = Depends(get_db)):
    
    # get uuid of recipe
    recipe = db.query(RecipeDB).filter(RecipeDB.public_id == recipe_uuid).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    # Zutaten & Anweisungen aufbereiten
    ingredients_list = recipe.ingredients_str.split("|") if recipe.ingredients_str else []
    instructions_list = recipe.instructions.split("\n\n") if recipe.instructions else []
    
    full_url = str(request.url) 
    
    # 2. Response erstellen
    response = templates.TemplateResponse("recipe_import.html", {
        "request": request,
        "recipe": recipe,
        "ingredients": ingredients_list,
        "instructions": instructions_list,
        "full_url": full_url
    })

    # block search engines
    response.headers["X-Robots-Tag"] = "noindex, nofollow, noarchive"
    
    return response

# for recipe import
@app.post("/api/import")
def import_recipe(item: RecipeImport, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    # check if recipe with this url already exists for this user
    existing_recipe = db.query(RecipeDB).filter(
            RecipeDB.original_url == item.url,
            RecipeDB.owner_id == current_user.id
        ).first()

    if existing_recipe:
        # Fehler zurückgeben
        raise HTTPException(
            status_code=400, 
            detail="Recipe already imported."
        )
    
    scraped_data = scrape_jsonld(item.url)

    # In DB speichern
    new_recipe = RecipeDB(
        title=scraped_data["title"],
        description=scraped_data["description"],
        image_url=scraped_data["image_url"],
        original_url=scraped_data["original_url"],
        ingredients_str=scraped_data["ingredients_str"],
        instructions=scraped_data["instructions"],
        prep_time=scraped_data.get("prep_time"),
        cook_time=scraped_data.get("cook_time"),
        total_time=scraped_data.get("total_time"),
        yields=scraped_data.get("yields"),
        owner_id=current_user.id
    )
    # 3. Falls Cookbook IDs übergeben wurden, die Beziehung setzen
    if item.cookbook_ids:
        cookbooks = db.query(CookbookDB).filter(
            CookbookDB.id.in_(item.cookbook_ids),
            CookbookDB.owner_id == current_user.id # Sicherheit: Nur eigene Kochbücher
        ).all()
        new_recipe.cookbooks = cookbooks

    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    
    return {"id": new_recipe.id, "title": new_recipe.title}


# mark recipe as cooked
@app.post("/api/recipes/{id}/mark-cooked")
def mark_as_cooked(id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    recipe = db.query(RecipeDB).filter(RecipeDB.id == id, RecipeDB.owner_id == current_user.id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    
    if recipe.cook_count is None:
        recipe.cook_count = 0
        
    recipe.cook_count += 1
    recipe.last_cooked = datetime.datetime.utcnow()
    db.commit()
    return {"cook_count": recipe.cook_count, "last_cooked": recipe.last_cooked}


# for recipe update (rating, notes)
@app.patch("/api/recipes/{id}")
def update_recipe(
    id: int, 
    update_data: RecipeUpdate, 
    db: Session = Depends(get_db), 
    current_user: UserDB = Depends(get_current_user)
):
    # Rezept suchen und prüfen, ob es dem User gehört
    recipe = db.query(RecipeDB).filter(
        RecipeDB.id == id, 
        RecipeDB.owner_id == current_user.id
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")

    # Nur die Felder aktualisieren, die im Request gesendet wurden
    if update_data.rating is not None:
        # Validierung: Sicherstellen, dass das Rating zwischen 0 und 5 liegt
        recipe.rating = max(0, min(5, update_data.rating))
        
    if update_data.notes is not None:
        recipe.notes = update_data.notes

    db.commit()
    db.refresh(recipe)
    
    return recipe

# Delete a specific recipe
@app.delete("/api/recipes/{id}")
def delete_recipe(id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    recipe = db.query(RecipeDB).filter(
        RecipeDB.id == id, 
        RecipeDB.owner_id == current_user.id
    ).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Rezept nicht gefunden")
    
    db.delete(recipe)
    db.commit()
    return {"message": "Rezept erfolgreich gelöscht"}


# for cookbooks
# list all cookbooks of current user
@app.get("/api/cookbooks")
def get_cookbooks(db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    return db.query(CookbookDB).options(joinedload(CookbookDB.recipes)).filter(
        CookbookDB.owner_id == current_user.id
    ).all()

# create cookbook for current user
@app.post("/api/cookbooks")
def create_cookbook(data: dict, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    new_cb = CookbookDB(name=data["name"], owner_id=current_user.id)
    db.add(new_cb)
    db.commit()
    return new_cb

# Delete a specific cookbook
@app.delete("/api/cookbooks/{cookbook_id}")
def delete_cookbook(
    cookbook_id: int, 
    db: Session = Depends(get_db), 
    current_user: UserDB = Depends(get_current_user)
):
    # Suche das Kochbuch und stelle sicher, dass es dem User gehört
    cookbook = db.query(CookbookDB).filter(
        CookbookDB.id == cookbook_id, 
        CookbookDB.owner_id == current_user.id
    ).first()

    if not cookbook:
        raise HTTPException(status_code=404, detail="Cookbook not found or access denied")

    db.delete(cookbook)
    db.commit()
    
    return {"message": "Cookbook deleted successfully"}

# add recipe to cookbook
@app.post("/api/cookbooks/{cb_id}/recipes/{r_id}")
def add_recipe_to_cookbook(cb_id: int, r_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    cb = db.query(CookbookDB).filter(CookbookDB.id == cb_id, CookbookDB.owner_id == current_user.id).first()
    recipe = db.query(RecipeDB).filter(RecipeDB.id == r_id, RecipeDB.owner_id == current_user.id).first()
    if not cb or not recipe: raise HTTPException(status_code=404)
    
    if recipe not in cb.recipes:
        cb.recipes.append(recipe)
        db.commit()
    return {"status": "added"}

# delete recipe from cookbook
@app.delete("/api/cookbooks/{cb_id}/recipes/{r_id}")
def remove_recipe_from_cookbook(cb_id: int, r_id: int, db: Session = Depends(get_db), current_user: UserDB = Depends(get_current_user)):
    cb = db.query(CookbookDB).filter(CookbookDB.id == cb_id, CookbookDB.owner_id == current_user.id).first()
    recipe = next((r for r in cb.recipes if r.id == r_id), None)
    if recipe:
        cb.recipes.remove(recipe)
        db.commit()
    return {"status": "removed"}

# GET details for a specific cookbook (including recipes)
@app.get("/api/cookbooks/{cookbook_id}")
def get_cookbook_detail(
    cookbook_id: int, 
    db: Session = Depends(get_db), 
    current_user: UserDB = Depends(get_current_user)
):
    # Wichtig: joinedload nutzen, damit die Rezepte direkt mitgeladen werden
    cookbook = db.query(CookbookDB).options(
        joinedload(CookbookDB.recipes)
    ).filter(
        CookbookDB.id == cookbook_id,
        CookbookDB.owner_id == current_user.id
    ).first()

    if not cookbook:
        raise HTTPException(status_code=404, detail="Cookbook not found")
        
    return cookbook