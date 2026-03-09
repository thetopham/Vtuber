import fs from "node:fs/promises";
import path from "node:path";
import WebSocket from "ws";
import type { AvatarAdapter } from "./AvatarAdapter";
import type { AvatarAdapterStatus, AvatarExpressionState } from "@vtuber/shared";

type VTubeRequest = {
  apiName: "VTubeStudioPublicAPI";
  apiVersion: "1.0";
  requestID: string;
  messageType: string;
  data?: Record<string, unknown>;
};

type VTubeResponse = {
  requestID?: string;
  messageType: string;
  data?: Record<string, unknown>;
};

const pluginName = "VtuberController";
const pluginDeveloper = "Vtuber";

export class VTubeStudioAdapter implements AvatarAdapter {
  private ws: WebSocket | null = null;

  private connected = false;

  private authenticated = false;

  private requestCounter = 0;

  private readonly pending = new Map<string, (response: VTubeResponse) => void>();

  private activeState: AvatarExpressionState = { base: "happy", overlays: [] };

  constructor(
    private readonly wsUrl: string,
    private readonly tokenPath: string,
    private readonly tokenFromEnv?: string
  ) {}

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    console.info("[VTubeStudioAdapter] Connecting", { wsUrl: this.wsUrl });

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(this.wsUrl);
      this.ws = socket;

      socket.once("open", () => {
        this.connected = true;
        console.info("[VTubeStudioAdapter] Connected");
        resolve();
      });

      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString()) as VTubeResponse;
        if (parsed.requestID && this.pending.has(parsed.requestID)) {
          const resolveRequest = this.pending.get(parsed.requestID);
          this.pending.delete(parsed.requestID);
          resolveRequest?.(parsed);
        }
      });

      socket.once("error", (error) => {
        console.error("[VTubeStudioAdapter] Connection error", error);
        reject(error);
      });

      socket.once("close", () => {
        this.connected = false;
        this.authenticated = false;
        console.info("[VTubeStudioAdapter] Disconnected");
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
    this.pending.clear();
  }

  getStatus(): AvatarAdapterStatus {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      activeState: this.activeState,
      activeTimers: {}
    };
  }

  async resetToDefault(): Promise<void> {
    console.info("[VTubeStudioAdapter] Reset to default happy");
    await this.triggerHotkey("happy");
    this.activeState = { base: "happy", overlays: [] };
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    if (state.base !== "happy") {
      await this.triggerHotkey(state.base);
    }

    for (const overlay of state.overlays) {
      await this.triggerHotkey(overlay);
    }

    this.activeState = {
      base: state.base,
      overlays: state.overlays
    };
  }

  async clearAllExpressions(): Promise<void> {
    console.info("[VTubeStudioAdapter] Clearing all expressions");
    await this.sendRequest("ExpressionStateRequest", {
      details: false,
      expressionFile: "",
      active: false
    });
  }

  private async authenticate(): Promise<void> {
    let token = this.tokenFromEnv || (await this.loadTokenFromDisk());

    if (!token) {
      const tokenResponse = await this.sendRequest("AuthenticationTokenRequest", {
        pluginName,
        pluginDeveloper
      });
      token = String(tokenResponse.data?.authenticationToken ?? "");
      if (token) {
        await this.saveTokenToDisk(token);
      }
    }

    if (!token) {
      throw new Error("Could not acquire VTube Studio auth token");
    }

    const response = await this.sendRequest("AuthenticationRequest", {
      pluginName,
      pluginDeveloper,
      authenticationToken: token
    });

    this.authenticated = Boolean(response.data?.authenticated);
    console.info("[VTubeStudioAdapter] Authentication status", {
      authenticated: this.authenticated
    });

    if (!this.authenticated) {
      throw new Error("VTube Studio authentication failed");
    }
  }

  private async triggerHotkey(hotkeyID: string): Promise<void> {
    console.info("[VTubeStudioAdapter] Trigger hotkey", { hotkeyID });
    await this.sendRequest("HotkeyTriggerRequest", {
      hotkeyID,
      itemInstanceID: ""
    });
  }

  private async sendRequest(
    messageType: string,
    data: Record<string, unknown>
  ): Promise<VTubeResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("VTube Studio socket is not open");
    }

    const requestID = `req-${Date.now()}-${this.requestCounter++}`;
    const payload: VTubeRequest = {
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      requestID,
      messageType,
      data
    };

    return new Promise<VTubeResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestID);
        reject(new Error(`Timed out waiting for ${messageType}`));
      }, 3000);

      this.pending.set(requestID, (response) => {
        clearTimeout(timeout);
        resolve(response);
      });

      this.ws?.send(JSON.stringify(payload), (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pending.delete(requestID);
          reject(error);
        }
      });
    });
  }

  private async loadTokenFromDisk(): Promise<string | undefined> {
    try {
      const token = await fs.readFile(this.tokenPath, "utf8");
      return token.trim();
    } catch {
      return undefined;
    }
  }

  private async saveTokenToDisk(token: string): Promise<void> {
    await fs.mkdir(path.dirname(this.tokenPath), { recursive: true });
    await fs.writeFile(this.tokenPath, token, "utf8");
  }
}
