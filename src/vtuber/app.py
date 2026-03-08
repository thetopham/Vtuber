from __future__ import annotations

import asyncio

from dotenv import load_dotenv

from .avatar import VTubeStudioClient
from .brain import NeuroBrain, infer_emotion
from .voice import VoiceEngine


async def main() -> None:
    load_dotenv()
    brain = NeuroBrain()
    voice = VoiceEngine()
    avatar = VTubeStudioClient()

    connected = await avatar.connect()
    if connected:
        print("[avatar] connected to VTube Studio websocket")
    else:
        print("[avatar] not connected (running in text-only mode)")

    print("NeuroStyle ready. Type messages (`exit` to quit).")
    try:
        while True:
            user = input("you> ").strip()
            if not user:
                continue
            if user.lower() in {"exit", "quit"}:
                break

            reply = brain.reply(user)
            emotion = infer_emotion(reply)
            print(f"neuro> {reply}")

            await avatar.set_emotion(emotion)
            voice.speak(reply)
    finally:
        await avatar.close()


if __name__ == "__main__":
    asyncio.run(main())
