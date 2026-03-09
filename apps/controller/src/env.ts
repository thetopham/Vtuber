import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTROLLER_PORT, DEFAULT_WS_PATH } from "@vtuber/shared";

const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));

dotenv.config({ path: rootEnvPath });

function normalizeVtsUrl(value: string): string {
  const trimmed = value.trim();
  const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `ws://${trimmed}`;
  const parsed = new URL(withProtocol);

  if (parsed.protocol !== "ws:" && parsed.protocol !== "wss:") {
    throw new Error(`VTS_WS_URL must use ws:// or wss:// protocol. Received: ${value}`);
  }

  return parsed.toString();
}

export const env = {
  port: Number(process.env.CONTROLLER_PORT ?? DEFAULT_CONTROLLER_PORT),
  wsPath: process.env.WS_PATH ?? DEFAULT_WS_PATH,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  vtsUrl: normalizeVtsUrl(process.env.VTS_WS_URL ?? "ws://127.0.0.1:8001"),
  vtsPluginName: process.env.VTS_PLUGIN_NAME ?? "Vtuber Controller",
  vtsPluginDeveloper: process.env.VTS_PLUGIN_DEVELOPER ?? "Vtuber Team",
  vtsAuthToken: process.env.VTS_AUTH_TOKEN,
  hotkeys: {
    happy: process.env.VTS_HOTKEY_HAPPY ?? "happy",
    angry: process.env.VTS_HOTKEY_ANGRY ?? "angry",
    approval: process.env.VTS_HOTKEY_APPROVAL ?? "approval",
    excited: process.env.VTS_HOTKEY_EXCITED ?? "excited",
    sad: process.env.VTS_HOTKEY_SAD ?? "sad",
    shocked: process.env.VTS_HOTKEY_SHOCKED ?? "shocked",
    embarrassed: process.env.VTS_HOTKEY_EMBARRASSED ?? "embarrassed",
    wink: process.env.VTS_HOTKEY_WINK ?? "wink"
  }
};
