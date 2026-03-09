import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import WebSocket from "ws";
import type {
  AvatarExpressionState,
  AvatarStatus,
  BaseExpression,
  OverlayExpression
} from "@vtuber/shared";
import type { AvatarAdapter } from "./AvatarAdapter";

const TOKEN_FILE = fileURLToPath(new URL("../../.vts-token.json", import.meta.url));
const API_NAME = "VTubeStudioPublicAPI";
const API_VERSION = "1.0";

type ActiveExpression = BaseExpression | OverlayExpression;

type VtsResponse = {
  requestID?: string;
  messageType: string;
  data?: Record<string, unknown>;
  errorID?: number;
  message?: string;
};

export class VTubeStudioAdapter implements AvatarAdapter {
  private ws: WebSocket | null = null;

  private connected = false;

  private authenticated = false;

  private currentState: AvatarExpressionState = { base: "happy", overlays: [] };

  private activeExpressions = new Set<ActiveExpression>();

  private expressionHotkeys: Record<ActiveExpression, string> = {
    happy: "happy",
    angry: "angry",
    approval: "approval",
    excited: "excited",
    sad: "sad",
    shocked: "shocked",
    embarrassed: "embarrassed",
    wink: "wink"
  };

  constructor(
    private readonly wsUrl: string,
    private readonly pluginName: string,
    private readonly pluginDeveloper: string
  ) {}

  getStatus(): AvatarStatus {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      currentState: this.currentState,
      activeTimers: {}
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.once("open", () => {
        this.connected = true;
        console.info("[VTS] connected", { wsUrl: this.wsUrl });
        resolve();
      });

      this.ws.once("error", (error) => {
        console.error("[VTS] connection error", { error: String(error) });
        reject(error);
      });

      this.ws?.on("close", () => {
        this.connected = false;
        this.authenticated = false;
        console.info("[VTS] disconnected");
      });
    });

    await this.authenticate();
  }

  async disconnect(): Promise<void> {
    if (!this.ws) {
      return;
    }

    this.ws.close();
    this.ws = null;
    this.connected = false;
    this.authenticated = false;
  }

  async clearAllExpressions(): Promise<void> {
    const entries = Array.from(this.activeExpressions.values());
    for (const expression of entries) {
      await this.triggerHotkey(this.expressionHotkeys[expression]);
      this.activeExpressions.delete(expression);
    }
    console.info("[VTS] cleared active expressions", { cleared: entries });
  }

  async resetToDefault(): Promise<void> {
    await this.clearAllExpressions();
    await this.triggerHotkey(this.expressionHotkeys.happy);
    this.activeExpressions.add("happy");
    this.currentState = { base: "happy", overlays: [] };
    console.info("[VTS] reset to default happy");
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    await this.resetToDefault();

    if (state.base !== "happy") {
      await this.triggerHotkey(this.expressionHotkeys[state.base]);
      this.activeExpressions.delete("happy");
      this.activeExpressions.add(state.base);
    }

    for (const overlay of state.overlays) {
      await this.triggerHotkey(this.expressionHotkeys[overlay]);
      this.activeExpressions.add(overlay);
    }

    this.currentState = {
      base: state.base,
      overlays: [...state.overlays],
      ...(state.durationMs ? { durationMs: state.durationMs } : {})
    };

    console.info("[VTS] expression state applied", { state: this.currentState });
  }

  private async authenticate(): Promise<void> {
    const token = this.readPluginToken();

    if (!token) {
      const freshToken = await this.requestAuthenticationToken();
      this.savePluginToken(freshToken);
      await this.authenticateWithToken(freshToken);
      this.authenticated = true;
      console.info("[VTS] authenticated with newly issued token");
      return;
    }

    try {
      await this.authenticateWithToken(token);
      this.authenticated = true;
      console.info("[VTS] authenticated with saved token");
    } catch {
      console.warn("[VTS] saved token rejected, requesting a new one");
      const freshToken = await this.requestAuthenticationToken();
      this.savePluginToken(freshToken);
      await this.authenticateWithToken(freshToken);
      this.authenticated = true;
      console.info("[VTS] authenticated with refreshed token");
    }
  }

  private async requestAuthenticationToken(): Promise<string> {
    const response = await this.sendRequest("AuthenticationTokenRequest", {
      pluginName: this.pluginName,
      pluginDeveloper: this.pluginDeveloper
    });

    const token = response.data?.authenticationToken;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("VTube Studio did not return an authentication token");
    }

    return token;
  }

  private async authenticateWithToken(authenticationToken: string): Promise<void> {
    await this.sendRequest("AuthenticationRequest", {
      pluginName: this.pluginName,
      pluginDeveloper: this.pluginDeveloper,
      authenticationToken
    });
  }

  private readPluginToken(): string | null {
    if (!existsSync(TOKEN_FILE)) {
      return null;
    }

    try {
      const raw = readFileSync(TOKEN_FILE, "utf8");
      const parsed = JSON.parse(raw) as { token?: string };
      return typeof parsed.token === "string" ? parsed.token : null;
    } catch {
      return null;
    }
  }

  private savePluginToken(token: string): void {
    const folder = dirname(TOKEN_FILE);
    if (!existsSync(folder)) {
      throw new Error(`Token folder missing: ${folder}`);
    }

    writeFileSync(TOKEN_FILE, JSON.stringify({ token }, null, 2));
  }

  private async triggerHotkey(hotkeyID: string): Promise<void> {
    console.info("[VTS] triggering hotkey", { hotkeyID });
    await this.sendRequest("HotkeyTriggerRequest", { hotkeyID });
  }

  private async sendRequest(
    messageType: string,
    data: Record<string, unknown>
  ): Promise<VtsResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("VTube Studio socket is not connected");
    }

    const requestID = randomUUID();
    const payload = {
      apiName: API_NAME,
      apiVersion: API_VERSION,
      requestID,
      messageType,
      data
    };

    return await new Promise<VtsResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.ws?.off("message", onMessage);
        reject(new Error(`Timed out waiting for ${messageType}`));
      }, 4000);

      const onMessage = (raw: WebSocket.RawData) => {
        const response = JSON.parse(String(raw)) as VtsResponse;
        if (response.requestID !== requestID) {
          return;
        }

        clearTimeout(timeout);
        this.ws?.off("message", onMessage);

        if (response.messageType === "APIError") {
          reject(new Error(response.message ?? "VTube Studio API error"));
          return;
        }

        resolve(response);
      };

      this.ws?.on("message", onMessage);
      this.ws?.send(JSON.stringify(payload));
    });
  }
}
