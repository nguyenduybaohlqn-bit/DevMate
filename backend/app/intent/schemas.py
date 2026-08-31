from enum import Enum
from pydantic import BaseModel, Field


class Intent(str, Enum):
    CHAT = "chat"
    CODE = "code"
    DEBUG = "debug"
    RESEARCH = "research"
    ANALYZE = "analyze"


class IntentResult(BaseModel):
    intent: Intent
    confidence: float = Field(ge=0.0, le=1.0)
    complexity: str = Field(
        description="low, medium, or high"
    )
    requires_context: bool
    requires_web: bool
    requires_codebase: bool