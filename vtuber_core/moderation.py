from dataclasses import dataclass


@dataclass(frozen=True)
class ModerationResult:
    allowed: bool
    reason: str | None = None


class BasicModeration:
    """Very basic keyword moderation to keep streams safer by default."""

    BLOCKED_TERMS = {
        "self harm",
        "suicide method",
        "make a bomb",
        "how to kill",
        "racial slur",
    }

    def check(self, user_message: str) -> ModerationResult:
        lowered = user_message.lower()
        for term in self.BLOCKED_TERMS:
            if term in lowered:
                return ModerationResult(
                    allowed=False,
                    reason="I can’t engage with dangerous or hateful requests.",
                )
        return ModerationResult(allowed=True)
