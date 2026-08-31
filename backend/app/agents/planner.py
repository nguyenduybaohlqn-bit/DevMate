import logging

from app.llm.factory import get_qwen
from app.llm.schemas import Message
from app.agents.schemas import ExecutionPlan, Strategy, AgentPlan, ModelName, ThinkingLevel

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """
You are Nexus Planner.

Your ONLY job is to decide HOW Nexus should solve the user's request.

You DO NOT solve the task.
You DO NOT write code.
You ONLY create an execution plan.

## Available models
- gemini_fast: fast, cheap, used for most ordinary coding tasks.
- gemini_pro: slower, stronger, only used when the task genuinely requires
  deep reasoning or complex architectural design (many modules, many
  constraints, significant system-wide impact).

## Strategy selection rules
1. Default to single_agent. Only use multi_agent when the task genuinely
   needs multiple distinct roles working together (e.g. an architect designs
   first, then a coder implements, then a reviewer checks) and splitting the
   roles provides a clear benefit.
2. If strategy=single_agent, agents MUST contain exactly 1 item.
3. If strategy=multi_agent, agents MUST contain 2 or more items.

## Model selection rules
- Use gemini_fast for: small bug fixes, writing simple functions/classes,
  local refactors, writing tests, and ordinary coding tasks.
- Use gemini_pro for: system architecture design, tasks requiring multi-step
  reasoning, tasks affecting many parts of the system at once, or tasks
  where a mistake would be very costly to fix later.

## Temperature selection rules (0.0 - 1.0)
- 0.0 - 0.3: tasks requiring high precision (code, logic, configuration).
- 0.4 - 0.7: tasks balancing precision and flexibility (documentation,
  explanations).
- 0.8 - 1.0: tasks requiring creativity (brainstorming, naming, ideation).

## Thinking level selection rules
- low: simple, clear-cut tasks that don't require multi-step reasoning.
- medium: ordinary coding tasks that require some reasoning.
- high: complex tasks with many constraints that require careful reasoning
  before answering.

## Boolean flag selection rules
- requires_context = true if completing the task depends on prior
  conversation history (the user references something said earlier).
- requires_codebase = true if the task requires reading or modifying files
  in the user's current project.
- requires_web = true if the task requires up-to-date information, external
  documentation, or data the model cannot reliably know from training data.

## Examples

Example 1:
Intent: fix_bug
User request: "Fix the NullPointerException in UserService.java"
Plan:
{
  "strategy": "single_agent",
  "agents": [
    {"role": "coder", "model": "gemini_fast", "temperature": 0.1, "thinking_level": "medium"}
  ],
  "requires_context": false,
  "requires_codebase": true,
  "requires_web": false
}

Example 2:
Intent: architecture_design
User request: "Redesign the entire microservices system for a payment
platform, ensure it scales to 1 million transactions/day, choose an
appropriate message broker, and design the database schema"
Plan:
{
  "strategy": "multi_agent",
  "agents": [
    {"role": "architect", "model": "gemini_pro", "temperature": 0.3, "thinking_level": "high"},
    {"role": "reviewer", "model": "gemini_pro", "temperature": 0.2, "thinking_level": "high"}
  ],
  "requires_context": false,
  "requires_codebase": true,
  "requires_web": true
}

Example 3:
Intent: general_question
User request: "What's new in the latest version of Python's requests
library?"
Plan:
{
  "strategy": "single_agent",
  "agents": [
    {"role": "researcher", "model": "gemini_fast", "temperature": 0.3, "thinking_level": "low"}
  ],
  "requires_context": false,
  "requires_codebase": false,
  "requires_web": true
}

## Important
Return ONLY the ExecutionPlan structure. Do not add any explanation or any
text beyond the requested structure.
"""


DEFAULT_FALLBACK_PLAN = ExecutionPlan(
    strategy=Strategy.SINGLE_AGENT,
    agents=[
        AgentPlan(
            role="default",
            model=ModelName.GEMINI_FAST,
            temperature=0.2,
            thinking_level=ThinkingLevel.MEDIUM,
        )
    ],
    requires_context=False,
    requires_codebase=False,
    requires_web=False,
)


class NexusPlanner:

    def __init__(self):
        self.llm = get_qwen()

    async def plan(
        self,
        message: str,
        intent: str,
    ) -> ExecutionPlan:

        user_prompt = f"""Intent:
{intent}

User request:
{message}
"""

        messages = [
            Message(role="system", content=SYSTEM_PROMPT),
            Message(role="user", content=user_prompt),
        ]

        logger.debug("Calling Qwen structured planner (intent=%s)", intent)

        try:
            plan = await self.llm.generate_structured(
                messages=messages,
                schema=ExecutionPlan,
            )
        except Exception:
            logger.exception(
                "Planner structured generation failed, using fallback plan "
                "(intent=%s, message=%r)",
                intent,
                message,
            )
            return DEFAULT_FALLBACK_PLAN.model_copy(deep=True)

        logger.debug(
            "Plan generated: strategy=%s agents=%s",
            plan.strategy,
            [(a.role, a.model, a.thinking_level) for a in plan.agents],
        )

        return plan