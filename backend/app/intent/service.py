from google import genai

from app.intent.intent_classifier import IntentClassifier


class IntentService:

    def __init__(self):
        client = genai.Client()
        self.classifier = IntentClassifier(
            client=client,
            model="gemini-2.5-flash",
        )

    async def classify(self, message: str):
        return await self.classifier.classify(message)