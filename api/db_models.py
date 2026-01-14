import uuid
from pydantic import BaseModel
from datetime import datetime, timedelta
from sqlalchemy import Table
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from typing import List, Optional


Base = declarative_base()

# Verknüpfungstabelle
cookbook_recipe_association = Table(
    "cookbook_recipe",
    Base.metadata,
    Column("cookbook_id", Integer, ForeignKey("cookbooks.id"), primary_key=True),
    Column("recipe_id", Integer, ForeignKey("recipes.id"), primary_key=True)
)

class RecipeDB(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True)
    description = Column(String)
    image_url = Column(String)
    original_url = Column(String)
    # Storing ingredients as a pipe-separated string for simplicity in PoC
    # e.g. "Shrimp|Garlic|Pasta"
    ingredients_str = Column(Text) 
    instructions = Column(Text)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("UserDB", back_populates="recipes")

    prep_time = Column(Integer, nullable=True)    # Vorbereitungszeit in Minuten
    cook_time = Column(Integer, nullable=True)    # Kochzeit in Minuten
    total_time = Column(Integer, nullable=True)   # Gesamtzeit in Minuten
    yields = Column(Integer, nullable=True)       # Anzahl der Portionen (z.B. 4)
    notes = Column(Text, nullable=True)             # Persönliche Notizen
    rating = Column(Integer, default=0)             # 0 bis 5 Sterne
    cook_count = Column(Integer, default=0)         # Wie oft gekocht
    last_cooked = Column(DateTime, nullable=True)   # Wann zuletzt gekocht

    # cookbooks relationship
    cookbooks = relationship("CookbookDB", secondary=cookbook_recipe_association, back_populates="recipes")

    # sharing
    is_shared = Column(Boolean, default=False)


class RecipeImport(BaseModel):
    url: str
    cookbook_ids: Optional[List[int]] = [] # Standardmäßig leere Liste


class RecipeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    original_url: Optional[str] = None
    ingredients_str: Optional[str] = None
    instructions: Optional[str] = None
    prep_time: Optional[int] = None
    cook_time: Optional[int] = None
    total_time: Optional[int] = None
    yields: Optional[int] = None
    notes: Optional[str] = None
    rating: Optional[int] = None
    

class UserDB(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False) # Admin muss genehmigen

    recipes = relationship("RecipeDB", back_populates="owner")


class UserCreate(BaseModel):
    email: str
    password: str

class CookbookDB(Base):
    __tablename__ = "cookbooks"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    recipes = relationship("RecipeDB", secondary=cookbook_recipe_association, back_populates="cookbooks")


class RecipeShare(Base):
    __tablename__ = "recipe_shares"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, default=lambda: datetime.utcnow() + timedelta(days=7))

    # Relationen
    recipe = relationship("RecipeDB")