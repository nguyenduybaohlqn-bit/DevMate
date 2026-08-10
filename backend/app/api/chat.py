from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services import chat_service
from app.schemas.chat import ChatRequest
from app.database import SessionLocal
from datetime import datetime
from app.repositories import conversation_repository

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/chat")
async def chat(chat_request: ChatRequest):
    return await chat_service.chat(
        chat_request.user_id,
        chat_request.message,
        chat_request.conversation_id
    )

@router.get("/conversations")
def get_conversations(user_id: str, db: Session = Depends(get_db)):
    convs = conversation_repository.get_conversations_by_user(db, user_id)
    return [
        {
            "id": str(c.id), 
            "user_id": str(c.user_id),
            "title": c.title, 
            # Sửa từ m.updated_at thành c.updated_at chuẩn theo biến vòng lặp
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat()
        }
        for c in convs
    ]

@router.get("/conversations/{conversation_id}/messages")
def get_messages(conversation_id: int, db: Session = Depends(get_db)):
    # Gọi hàm thuần túy từ repository lên
    msgs = conversation_repository.get_messages(db, conversation_id)
    
    formatted_messages = []
    for m in msgs:
        # Tầng router xử lý vá lỗi dữ liệu cũ dạng chuỗi chữ (str) ở đây
        if isinstance(m.created_at, str):
            try:
                dt = datetime.fromisoformat(m.created_at.replace(' ', 'T'))
            except ValueError:
                dt = datetime.now()
        else:
            dt = m.created_at

        formatted_messages.append({
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "timestamp": dt.isoformat() if dt else None
        })
        
    return formatted_messages