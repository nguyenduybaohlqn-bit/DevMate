from pydantic import BaseModel

class ChatRequest(BaseModel):
    user_id: int
    conversation_id: int | None = None
    message: str

class ChatResponse(BaseModel):
    message: str
    conversation_id: int
    conversation_title: str