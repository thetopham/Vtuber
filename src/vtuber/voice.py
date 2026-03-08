from __future__ import annotations

import os


class VoiceEngine:
    def __init__(self) -> None:
        self.enabled = os.getenv("VOICE_ENABLED", "1") == "1"
        self._engine = None
        if self.enabled:
            try:
                import pyttsx3

                self._engine = pyttsx3.init()
                self._engine.setProperty("rate", 185)
            except Exception:
                self.enabled = False

    def speak(self, text: str) -> None:
        if not self.enabled or not self._engine:
            return
        self._engine.say(text)
        self._engine.runAndWait()
