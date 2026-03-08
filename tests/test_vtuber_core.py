from vtuber_core import VtuberBrain


def test_detect_emotion_hype() -> None:
    brain = VtuberBrain()
    assert brain.detect_emotion("That clutch was insane, let's go!") == "hype"


def test_respond_payload_shape() -> None:
    brain = VtuberBrain(seed=1)
    data = brain.respond("explain this build")

    assert "reply" in data
    assert data["avatar"]["emotion"] in {"focused", "neutral", "hype", "comfort", "sarcastic"}
    assert data["avatar"]["talking"] is True
    assert 0.0 <= data["avatar"]["intensity"] <= 1.0
