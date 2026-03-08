from collections import deque
from dataclasses import dataclass


@dataclass(frozen=True)
class Message:
    role: str
    text: str


class ShortTermMemory:
    """Rolling chat memory used to keep recent context for responses."""

    def __init__(self, max_messages: int = 20) -> None:
        if max_messages < 2:
            raise ValueError("max_messages must be >= 2")
        self._messages: deque[Message] = deque(maxlen=max_messages)

    def add(self, role: str, text: str) -> None:
        self._messages.append(Message(role=role, text=text.strip()))

    def as_prompt_context(self) -> str:
        lines = [f"{msg.role.upper()}: {msg.text}" for msg in self._messages]
        return "\n".join(lines)

    def __len__(self) -> int:
        return len(self._messages)
