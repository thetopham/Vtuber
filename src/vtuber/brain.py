from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict


@dataclass
class BrainConfig:
    persona_file: Path = Path("config/persona.md")
    model: str = field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o-mini"))
    history_size: int = 8


class NeuroBrain:
    def __init__(self, config: BrainConfig | None = None) -> None:
        self.config = config or BrainConfig()
        self.system_prompt = self._load_persona()
        self.history: List[Dict[str, str]] = []

    def _load_persona(self) -> str:
        if self.config.persona_file.exists():
            return self.config.persona_file.read_text(encoding="utf-8").strip()
        return "You are a witty AI VTuber."

    def reply(self, user_text: str) -> str:
        api_key = os.getenv("OPENAI_API_KEY", "").strip()
        if api_key:
            try:
                return self._openai_reply(user_text, api_key)
            except Exception:
                # Fall back to deterministic local behavior.
                pass
        return self._fallback_reply(user_text)

    def _openai_reply(self, user_text: str, api_key: str) -> str:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        messages = [{"role": "system", "content": self.system_prompt}] + self.history + [
            {"role": "user", "content": user_text}
        ]
        resp = client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            temperature=0.9,
            max_tokens=180,
        )
        answer = (resp.choices[0].message.content or "").strip() or "Chat broke. I blame quantum hamsters."
        self._remember(user_text, answer)
        return answer

    def _fallback_reply(self, user_text: str) -> str:
        text = user_text.lower()
        if "hello" in text or "hi" in text:
            answer = "Yo chat! I'm online and at least 37% stable today."
        elif "joke" in text:
            answer = "I tried touching grass once. Graphics were good, gameplay mid."
        elif "who are you" in text:
            answer = "I'm NeuroStyle, your chaotic AI streamer roommate."
        else:
            answer = f"Hot take on '{user_text}': that's either genius... or speedrun brainrot."
        self._remember(user_text, answer)
        return answer

    def _remember(self, user_text: str, answer: str) -> None:
        self.history.append({"role": "user", "content": user_text})
        self.history.append({"role": "assistant", "content": answer})
        if len(self.history) > self.config.history_size * 2:
            self.history = self.history[-self.config.history_size * 2 :]


def infer_emotion(text: str) -> str:
    lower = text.lower()
    if any(k in lower for k in ["lol", "haha", "love", "great", "nice"]):
        return "happy"
    if any(k in lower for k in ["angry", "mad", "hate", "stupid"]):
        return "angry"
    if any(k in lower for k in ["what", "wait", "surprise", "no way", "?!"]):
        return "surprised"
    return "neutral"
