import os
from typing import List, Optional # Python 3.8 compatibility import
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

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
Base = declarative_base()

# --- 2. DATABASE MODEL ---

class RecipeDB(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    image_url = Column(String)
    # Storing ingredients as a pipe-separated string for simplicity in PoC
    # e.g. "Shrimp|Garlic|Pasta"
    ingredients_str = Column(Text) 
    instructions = Column(Text)

# --- 3. APP SETUP ---

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

# --- 4. STARTUP EVENT (AUTO-SEEDING) ---
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
            instructions="1. Connect to Database.\n2. Fetch Data.\n3. Render React.\n4. Click Bring Button."
        )
        db.add(sample)
        db.commit()
    db.close()

# --- 5. ENDPOINTS ---

@app.get("/api/recipe")
def get_recipe_json(db: Session = Depends(get_db)):
    # Just fetch the first recipe for this PoC
    recipe = db.query(RecipeDB).first()
    if not recipe:
        return {"error": "No data found"}
    
    # Convert string back to list for Frontend
    return {
        "title": recipe.title,
        "description": recipe.description,
        "image_url": recipe.image_url,
        "ingredients": recipe.ingredients_str.split("|"),
        "instructions": recipe.instructions
    }

@app.get("/r/{rid}", response_class=HTMLResponse)
def recipe_import_page(request: Request, rid: int, db: Session = Depends(get_db)):
    # Nur der erste Eintrag (ID 1) ist relevant in unserem PoC
    if rid != 1:
        raise HTTPException(status_code=404, detail="Recipe not found")

    recipe = db.query(RecipeDB).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found in DB")

    # Zutaten in eine Liste umwandeln (wie im Template benötigt)
    ingredients_list = recipe.ingredients_str.split("|")
    instructions_list = recipe.instructions.split("\n")
    
    # Die volle URL (wichtig für das Bring! Widget)
    full_url = str(request.url) 
    
    return templates.TemplateResponse("recipe_import.html", {
        "request": request,
        "recipe": recipe,
        "ingredients": ingredients_list, # NEU: Liste der Zutaten
        "instructions": instructions_list, # NEU: Liste der Anweisungen
        "full_url": full_url # Wichtig für data-bring-import
    })