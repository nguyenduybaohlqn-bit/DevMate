from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import logging
from app.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL
if not db_url:
    logger.warning("DATABASE_URL not set; falling back to local SQLite database ./dev.db")
    db_url = "sqlite:///./dev.db"

Base = declarative_base()

# For SQLite, provide the required connect_args
if db_url.startswith("sqlite"):
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
else:
    engine = create_engine(db_url)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)