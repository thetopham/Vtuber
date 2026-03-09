import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { DEFAULT_CONTROLLER_PORT, DEFAULT_WS_PATH } from "@vtuber/shared";

const rootEnvPath = fileURLToPath(new URL("../../../.env", import.meta.url));

dotenv.config({ path: rootEnvPath });

export const env = {
  port: Number(process.env.CONTROLLER_PORT ?? DEFAULT_CONTROLLER_PORT),
  wsPath: process.env.WS_PATH ?? DEFAULT_WS_PATH,
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  vtubeStudioWsUrl: process.env.VTS_WS_URL ?? "ws://127.0.0.1:8001",
  vtubeStudioAuthToken: process.env.VTS_AUTH_TOKEN,
  vtubeStudioTokenPath:
    process.env.VTS_TOKEN_PATH ?? fileURLToPath(new URL("../../../.vtube-token", import.meta.url))
};
