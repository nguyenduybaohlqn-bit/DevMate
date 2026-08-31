from enum import Enum

from pydantic import BaseModel, Field, model_validator


class Strategy(str, Enum):
    SINGLE_AGENT = "single_agent"
    MULTI_AGENT = "multi_agent"


class ModelName(str, Enum):
    GEMINI_FAST = "gemini_fast"
    GEMINI_PRO = "gemini_pro"


class ThinkingLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class AgentPlan(BaseModel):
    role: str = Field(
        ...,
        description="Vai trò của agent trong plan, ví dụ: 'coder', 'reviewer', 'architect'.",
    )

    model: ModelName = Field(
        ...,
        description="Model được chọn để thực thi vai trò này.",
    )

    temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
        description="Độ sáng tạo của model, 0.0 = deterministic, 1.0 = tự do.",
    )

    thinking_level: ThinkingLevel = Field(
        default=ThinkingLevel.MEDIUM,
        description="Mức độ 'suy nghĩ' của model trước khi trả lời.",
    )


class ExecutionPlan(BaseModel):
    strategy: Strategy

    agents: list[AgentPlan] = Field(
        ...,
        min_length=1,
        description="Danh sách agent sẽ tham gia thực thi task.",
    )

    requires_context: bool = Field(
        default=False,
        description="True nếu task phụ thuộc vào lịch sử hội thoại trước đó.",
    )
    requires_codebase: bool = Field(
        default=False,
        description="True nếu task cần đọc/sửa file trong project hiện tại.",
    )
    requires_web: bool = Field(
        default=False,
        description="True nếu task cần thông tin cập nhật hoặc tài liệu bên ngoài.",
    )

    @model_validator(mode="after")
    def validate_agent_count(self) -> "ExecutionPlan":
        if self.strategy == Strategy.SINGLE_AGENT and len(self.agents) != 1:
            raise ValueError(
                f"strategy=single_agent yêu cầu đúng 1 agent, nhận được {len(self.agents)}"
            )

        if self.strategy == Strategy.MULTI_AGENT and len(self.agents) < 2:
            raise ValueError(
                f"strategy=multi_agent yêu cầu >=2 agent, nhận được {len(self.agents)}"
            )

        return self