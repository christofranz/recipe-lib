import os
from fastapi import FastAPI, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from .recipe_scraper import scrape_jsonld
from .db_models import RecipeDB, RecipeImport, Base, UserDB, UserCreate
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

# Endpoint to get recipe details
@app.get("/api/recipes/{recipe_id}")
def get_recipe_detail(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(RecipeDB).filter(RecipeDB.id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
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

    scraped_data = scrape_jsonld(item.url)

    # In DB speichern
    new_recipe = RecipeDB(
        title=scraped_data["title"],
        description=scraped_data["description"],
        image_url=scraped_data["image_url"],
        ingredients_str=scraped_data["ingredients_str"],
        instructions=scraped_data["instructions"],
        owner_id=current_user.id
    )
    
    db.add(new_recipe)
    db.commit()
    db.refresh(new_recipe)
    
    return {"id": new_recipe.id, "title": new_recipe.title}