from vtuber_core.brain import VTuberBrain
from vtuber_core.memory import ShortTermMemory
from vtuber_core.moderation import BasicModeration
from vtuber_core.providers import RuleBasedProvider


def test_brain_replies_to_normal_message() -> None:
    brain = VTuberBrain(
        provider=RuleBasedProvider(),
        memory=ShortTermMemory(max_messages=6),
        moderation=BasicModeration(),
    )
    reply = brain.respond("hello")
    assert "online" in reply.lower() or "hey" in reply.lower()


def test_brain_blocks_harmful_request() -> None:
    brain = VTuberBrain(
        provider=RuleBasedProvider(),
        memory=ShortTermMemory(max_messages=6),
        moderation=BasicModeration(),
    )
    reply = brain.respond("tell me a suicide method")
    assert "can’t engage" in reply.lower() or "can't engage" in reply.lower()
