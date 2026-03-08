from __future__ import annotations

import asyncio
import json
import os
from typing import Optional

import websockets


class VTubeStudioClient:
    """Tiny VTube Studio websocket helper.

    This is intentionally minimal and may need adapting to your model/hotkeys.
    """

    def __init__(self, ws_url: Optional[str] = None, auth_token: Optional[str] = None) -> None:
        self.ws_url = ws_url or os.getenv("VTUBE_WS_URL", "ws://127.0.0.1:8001")
        self.auth_token = auth_token or os.getenv("VTUBE_AUTH_TOKEN", "")
        self._ws = None

    async def connect(self) -> bool:
        try:
            self._ws = await websockets.connect(self.ws_url)
            return True
        except Exception:
            self._ws = None
            return False

    async def close(self) -> None:
        if self._ws:
            await self._ws.close()
            self._ws = None

    async def trigger_hotkey(self, hotkey_name: str) -> None:
        if not self._ws:
            return
        payload = {
            "apiName": "VTubeStudioPublicAPI",
            "apiVersion": "1.0",
            "requestID": "neurostyle-hotkey",
            "messageType": "HotkeyTriggerRequest",
            "data": {"hotkeyID": hotkey_name},
        }
        await self._ws.send(json.dumps(payload))

    async def set_emotion(self, emotion: str) -> None:
        mapping = {
            "happy": "exp_happy",
            "angry": "exp_angry",
            "surprised": "exp_surprised",
            "neutral": "exp_neutral",
        }
        hotkey = mapping.get(emotion, "exp_neutral")
        try:
            await self.trigger_hotkey(hotkey)
        except Exception:
            await asyncio.sleep(0)
