from functools import lru_cache

from .base import BaseLLM
from .gemini import GeminiLLM


@lru_cache
def get_intent_llm() -> GeminiLLM:
    return GeminiLLM(
        primary_model="gemini-3.5-flash-lite",
        fallback_model="gemini-3.7-flash",
    )


@lru_cache
def get_fast_llm() -> GeminiLLM:
    return GeminiLLM(
        primary_model="gemini-3.7-flash",
        fallback_model="gemini-3.5-flash",
    )


@lru_cache
def get_reasoning_llm() -> GeminiLLM:
    return GeminiLLM(
        primary_model="gemini-3.1-pro-preview",
        fallback_model="gemini-3.7-flash",
    )


@lru_cache
def get_qwen() -> BaseLLM:
    from .ollama import QwenLLM

    return QwenLLM(
        primary_model="qwen3:4b-instruct"
    )


MODEL_REGISTRY = {
    "gemini_fast": get_fast_llm,
    "gemini_pro": get_reasoning_llm,
}