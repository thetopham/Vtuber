import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTROLLER_PORT, DEFAULT_WS_PATH } from "@vtuber/shared";
import type { TtsStyleMode } from "./speech/ttsInstructions";

const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));

dotenv.config({ path: rootEnvPath });

const ttsStyleModes = new Set<TtsStyleMode>(["default", "cozy", "high_energy", "comforting", "focused"]);

function parseTtsStyleMode(value: string | undefined): TtsStyleMode {
  if (value && ttsStyleModes.has(value as TtsStyleMode)) {
    return value as TtsStyleMode;
  }

  return "default";
}

function parseTtsSpeed(value: string | undefined): number {
  const normalizedValue = value?.trim();
  const numericValue = Number(normalizedValue ? normalizedValue : "1");
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.min(Math.max(numericValue, 0.25), 4);
}

export const env = {
  port: Number(process.env.CONTROLLER_PORT ?? DEFAULT_CONTROLLER_PORT),
  wsPath: process.env.WS_PATH ?? DEFAULT_WS_PATH,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  vtsUrl: process.env.VTS_WS_URL ?? "ws://127.0.0.1:8001",
  vtsPluginName: process.env.VTS_PLUGIN_NAME ?? "Vtuber Controller",
  vtsPluginDeveloper: process.env.VTS_PLUGIN_DEVELOPER ?? "Vtuber Team",
  vtsAuthToken: process.env.VTS_AUTH_TOKEN,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
  openaiTtsModel: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
  openaiTtsVoice: process.env.OPENAI_TTS_VOICE ?? "marin",
  openaiTtsSpeed: parseTtsSpeed(process.env.OPENAI_TTS_SPEED),
  openaiTtsStyleMode: parseTtsStyleMode(process.env.OPENAI_TTS_STYLE_MODE),
  hotkeys: {
    happy: process.env.VTS_HOTKEY_HAPPY ?? "happy",
    neutral: process.env.VTS_HOTKEY_NEUTRAL ?? "neutral",
    angry: process.env.VTS_HOTKEY_ANGRY ?? "angry",
    approval: process.env.VTS_HOTKEY_APPROVAL ?? "approval",
    excited: process.env.VTS_HOTKEY_EXCITED ?? "excited",
    sad: process.env.VTS_HOTKEY_SAD ?? "sad",
    shocked: process.env.VTS_HOTKEY_SHOCKED ?? "shocked",
    embarrassed: process.env.VTS_HOTKEY_EMBARRASSED ?? "embarrassed",
    wink: process.env.VTS_HOTKEY_WINK ?? "wink"
  }
};
