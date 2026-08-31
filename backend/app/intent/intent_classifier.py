from google import genai

from app.intent.schemas import IntentResult
from app.intent.prompt import SYSTEM_PROMPT


class IntentClassifier:

    def __init__(
        self,
        client: genai.Client,
        model: str,
    ):
        self.client = client
        self.model = model

    async def classify(self, message: str) -> IntentResult:

        response = await self.client.aio.models.generate_content(
            model=self.model,
            contents=message,
            config={
                "system_instruction": SYSTEM_PROMPT,
                "temperature": 0,
                "response_mime_type": "application/json",
                "response_schema": IntentResult,
            },
        )

        return IntentResult.model_validate_json(response.text)