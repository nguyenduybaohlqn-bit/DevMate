from app.llm.factory import MODEL_REGISTRY
from app.llm.schemas import LLMConfig, Message

from .schemas import ExecutionPlan, Strategy


class NexusExecutor:

    async def stream(
        self,
        plan: ExecutionPlan,
        messages: list[Message],
    ):

        if plan.strategy != Strategy.SINGLE_AGENT:
            raise NotImplementedError(
                "Multi-agent chưa được implement trong MVP."
            )

        agent = plan.agents[0]

        factory = MODEL_REGISTRY.get(agent.model)

        if factory is None:
            raise ValueError(
                f"Model không được hỗ trợ: {agent.model}"
            )

        llm = factory()

        config = LLMConfig(
            temperature=agent.temperature,
            thinking_level=agent.thinking_level,
        )
        print("[DEBUG] Starting LLM stream...")
        async for text in llm.stream(
            messages,
            config=config,
        ):
            yield text