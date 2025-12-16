import uuid
from pydantic import BaseModel
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base


Base = declarative_base()

class RecipeDB(Base):
    __tablename__ = "recipes"
    
    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, index=True)
    description = Column(String)
    image_url = Column(String)
    # Storing ingredients as a pipe-separated string for simplicity in PoC
    # e.g. "Shrimp|Garlic|Pasta"
    ingredients_str = Column(Text) 
    instructions = Column(Text)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("UserDB", back_populates="recipes")


class RecipeImport(BaseModel):
    url: str


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