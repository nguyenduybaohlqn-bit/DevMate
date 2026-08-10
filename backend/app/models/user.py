from sqlalchemy import Integer, String
from sqlalchemy.orm import mapped_column
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = mapped_column(Integer, primary_key=True, index=True)
    username = mapped_column(String(50), unique=True, index=True)
    email = mapped_column(String(100), unique=True, index=True)
    password = mapped_column(String(100))
