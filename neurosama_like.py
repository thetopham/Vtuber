from dotenv import load_dotenv

from vtuber_core.brain import VTuberBrain
from vtuber_core.memory import ShortTermMemory
from vtuber_core.moderation import BasicModeration
from vtuber_core.providers import OpenAICompatibleProvider, RuleBasedProvider


def build_brain(use_openai: bool = False) -> VTuberBrain:
    provider = OpenAICompatibleProvider() if use_openai else RuleBasedProvider()
    return VTuberBrain(
        provider=provider,
        memory=ShortTermMemory(max_messages=24),
        moderation=BasicModeration(),
    )


def main() -> None:
    load_dotenv()
    brain = build_brain(use_openai=False)

    print("🎤 Neuro-style VTuber is live. Type 'quit' to stop.")
    while True:
        user = input("chat> ").strip()
        if not user:
            continue
        if user.lower() in {"quit", "exit"}:
            print("stream> Ending stream, thanks chat.")
            break

        reply = brain.respond(user)
        print(f"stream> {reply}")


if __name__ == "__main__":
    main()
