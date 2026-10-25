from google import genai
from google.genai import types
from pydantic import BaseModel


class GeminiProvider:
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)

    async def generate_json[T: BaseModel](
        self, *, model: str, system: str, prompt: str, schema: type[T]
    ) -> T:
        response = await self.client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_json_schema=schema.model_json_schema(by_alias=True),
                temperature=0.2,
            ),
        )
        if not response.text:
            raise ValueError("Empty response from model")
        return schema.model_validate_json(response.text)
