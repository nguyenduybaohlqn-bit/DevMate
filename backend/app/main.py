from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import Base, engine
from app.api import chat, auth
from app.models.user import User
from app.models.conversation import Conversation

app = FastAPI()

Base.metadata.create_all(bind=engine)

origins = [
    "http://localhost:5173",    # Port mặc định của Vite (React/Vue)
    "http://127.0.0.1:5173",
]

# 3. Thêm CORSMiddleware vào cấu hình của app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # Cho phép các nguồn trong danh sách trên
    allow_credentials=True,
    allow_methods=["*"],             # Cho phép tất cả các hàm GET, POST, PUT, DELETE...
    allow_headers=["*"],
    expose_headers=["X-Conversation-Id", "X-Conversation-Title"],            
)

app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(auth.router, prefix="/api", tags=["Authentication"])

@app.get("/")
def read_root():
    return {"status": "healthy"}