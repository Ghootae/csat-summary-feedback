import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()


def _extract_text_from_response(resp: Any) -> str:
    """Supports common OpenAI SDK response shapes."""
    # Chat Completions
    if hasattr(resp, "choices"):
        return resp.choices[0].message.content

    # Responses API fallback shapes, if user adapts later
    if hasattr(resp, "output_text"):
        return resp.output_text

    raise RuntimeError("Unsupported OpenAI response shape")


class LLMClient:
    def __init__(self, model: str | None = None):
        self.model = model or os.getenv("OPENAI_MODEL")
        if not self.model:
            raise RuntimeError("OPENAI_MODEL is not set. Put it in .env or environment variables.")
        self.client = OpenAI()

    def json_call(self, prompt: str, *, temperature: float = 0.7) -> dict[str, Any]:
        """Call model and parse JSON output.

        Uses Chat Completions JSON object mode for broad SDK compatibility.
        For stricter production use, replace with Structured Outputs JSON Schema.
        """
        resp = self.client.chat.completions.create(
            model=self.model,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": "You output valid JSON only."},
                {"role": "user", "content": prompt},
            ],
        )
        text = _extract_text_from_response(resp)
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise RuntimeError(f"Model did not return valid JSON. Raw output:\n{text}") from e
