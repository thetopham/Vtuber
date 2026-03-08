import os
from abc import ABC, abstractmethod


class ResponseProvider(ABC):
    @abstractmethod
    def generate(self, system_prompt: str, context: str, user_message: str) -> str:
        raise NotImplementedError


class RuleBasedProvider(ResponseProvider):
    """Offline default provider so the starter works without API keys."""

    def generate(self, system_prompt: str, context: str, user_message: str) -> str:
        user = user_message.lower().strip()
        if "hello" in user or "hi" in user:
            return "Hey chat! I’m online and ready to cause wholesome chaos."
        if "sing" in user:
            return "La la la~ I’d sing better with a proper TTS + voice model pipeline!"
        if "game" in user:
            return "I vote for a challenge run. Bonus points if chat trolls me fairly."
        if "who are you" in user:
            return "I’m a Neuro-style AI VTuber prototype: chatty, playful, and moderately unhinged."
        return (
            "Interesting take, chat. I’m processing that with maximum gamer focus. "
            f"You said: '{user_message.strip()}'"
        )


class OpenAICompatibleProvider(ResponseProvider):
    """Optional provider using OpenAI-compatible chat completions endpoint."""

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self.model = model
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("Install dependencies: pip install -r requirements.txt") from exc

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing.")
        self._client = OpenAI(api_key=api_key)

    def generate(self, system_prompt: str, context: str, user_message: str) -> str:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": f"Recent context:\n{context}"},
            {"role": "user", "content": user_message},
        ]
        result = self._client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.9,
            max_tokens=180,
        )
        return result.choices[0].message.content or "...chat broke me for a second."
