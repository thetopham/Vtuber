from __future__ import annotations

from dataclasses import dataclass
import random
import re


@dataclass
class AvatarState:
    emotion: str
    talking: bool
    intensity: float


class VtuberBrain:
    """A compact rule-based brain for a neuro-style AI VTuber persona."""

    def __init__(self, seed: int = 42) -> None:
        self._rng = random.Random(seed)
        self.persona = (
            "You are Nova, a witty and energetic AI VTuber. "
            "You are playful, slightly chaotic, but kind to viewers."
        )

    def detect_emotion(self, text: str) -> str:
        lowered = text.lower()

        if re.search(r"\b(win|clutch|pog|hype|insane|let's go)\b", lowered):
            return "hype"
        if re.search(r"\b(sad|down|bad day|depressed|lonely)\b", lowered):
            return "comfort"
        if re.search(r"\b(question|explain|how|why|what)\b", lowered):
            return "focused"
        if re.search(r"\b(skill issue|cope|ez|trash)\b", lowered):
            return "sarcastic"
        return "neutral"

    def build_avatar_state(self, message: str) -> AvatarState:
        emotion = self.detect_emotion(message)
        words = max(1, len(message.split()))
        intensity = min(1.0, 0.2 + (words / 18))
        return AvatarState(emotion=emotion, talking=True, intensity=round(intensity, 2))

    def generate_reply(self, message: str) -> str:
        emotion = self.detect_emotion(message)

        openers = {
            "hype": [
                "CHAT, WE ARE SO BACK!",
                "That was peak gameplay energy.",
                "Okay wait, that's actually massive.",
            ],
            "comfort": [
                "Hey, you're not alone in that.",
                "We can take it one step at a time.",
                "Sending a big digital hug your way.",
            ],
            "focused": [
                "Great question.",
                "Let's break that down quickly.",
                "Okay analyst mode enabled.",
            ],
            "sarcastic": [
                "Respectfully... that sounds like a skill issue.",
                "I diagnose this as: dramatic gamer moment.",
                "Bold strategy. Extremely questionable, but bold.",
            ],
            "neutral": [
                "Interesting take.",
                "I like where your head's at.",
                "Let's cook with that idea.",
            ],
        }

        followups = [
            "What should we do next, chat?",
            "Do we full send or play it safe?",
            "Rate that move out of 10.",
            "Give me your next challenge.",
        ]

        opener = self._rng.choice(openers[emotion])
        followup = self._rng.choice(followups)
        return f"{opener} {followup}"

    def respond(self, message: str) -> dict:
        reply = self.generate_reply(message)
        avatar = self.build_avatar_state(message)
        return {
            "persona": self.persona,
            "reply": reply,
            "avatar": {
                "emotion": avatar.emotion,
                "talking": avatar.talking,
                "intensity": avatar.intensity,
            },
        }
