from dataclasses import dataclass
from typing import Optional


@dataclass
class Message:
    """Format tin nhắn trung gian, dùng chung cho mọi provider (Gemini, Qwen, ...)."""
    role: str  # "user" | "assistant" | "system"
    content: str


@dataclass
class LLMConfig:
    """Config trung gian cho một lần gọi model."""
    temperature: Optional[float] = None
    system_instruction: Optional[str] = None