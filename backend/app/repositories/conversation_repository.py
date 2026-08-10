from datetime import datetime
from datetime import timezone
from app.models.message import Message
from app.models import Conversation
from sqlalchemy import desc

def save_message(db, conversation_id, role, content):
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        created_at=datetime.now(timezone.utc)
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message

def create_conversation(db, user_id, title):
    conversation = Conversation(
        user_id=user_id,
        title=title,
        created_at=datetime.now(timezone.utc)
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

def get_conversations_by_user(db, user_id):
    return (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(desc(Conversation.updated_at))
        .all()
    )

def get_messages(db, conversation_id):
    return (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )

def get_conversation(db, conversation_id):
    return db.query(Conversation).filter(Conversation.id == conversation_id).first()