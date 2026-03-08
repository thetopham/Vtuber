from dataclasses import dataclass

from vtuber_core.memory import ShortTermMemory
from vtuber_core.moderation import BasicModeration
from vtuber_core.providers import ResponseProvider


NEURO_STYLE_PERSONA = """
You are an AI VTuber inspired by high-energy gaming streamers.
Style rules:
- Keep replies short (1-3 sentences).
- Be playful, witty, and streamer-like.
- Never claim to be human.
- Do not provide dangerous, hateful, or explicit content.
- If asked for harmful content, refuse briefly and redirect.
""".strip()


@dataclass
class VTuberBrain:
    provider: ResponseProvider
    memory: ShortTermMemory
    moderation: BasicModeration
    persona: str = NEURO_STYLE_PERSONA

    def respond(self, user_message: str) -> str:
        mod = self.moderation.check(user_message)
        self.memory.add("user", user_message)

        if not mod.allowed:
            reply = mod.reason or "Nope."
            self.memory.add("assistant", reply)
            return reply

        context = self.memory.as_prompt_context()
        reply = self.provider.generate(
            system_prompt=self.persona,
            context=context,
            user_message=user_message,
        )
        self.memory.add("assistant", reply)
        return reply
