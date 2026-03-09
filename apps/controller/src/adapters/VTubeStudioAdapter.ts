import { WebSocket } from "ws";
import type {
  AvatarExpressionState,
  BaseExpression,
  OverlayExpression
} from "@vtuber/shared";
import type { AvatarAdapter, AvatarAdapterStatus } from "./AvatarAdapter";

type VtsEnvelope = {
  apiName: "VTubeStudioPublicAPI";
  apiVersion: "1.0";
  requestID: string;
  messageType: string;
  data?: Record<string, unknown>;
};

export class VTubeStudioAdapter implements AvatarAdapter {
  private socket: WebSocket | null = null;
  private connected = false;
  private authenticated = false;
  private token: string | null;
  private activeExpressions = new Set<string>();

  private readonly wsUrl: string;
  private readonly pluginName: string;
  private readonly pluginDeveloper: string;
  private readonly pluginIcon: string;
  private readonly hotkeys: Record<BaseExpression | OverlayExpression, string>;

  constructor() {
    this.wsUrl = process.env.VTS_WS_URL ?? "ws://127.0.0.1:8001";
    this.pluginName = process.env.VTS_PLUGIN_NAME ?? "ai-vtuber-controller";
    this.pluginDeveloper = process.env.VTS_PLUGIN_DEVELOPER ?? "local";
    this.pluginIcon = process.env.VTS_PLUGIN_ICON ?? "";
    this.token = process.env.VTS_AUTH_TOKEN ?? null;

    this.hotkeys = {
      happy: process.env.VTS_HOTKEY_HAPPY ?? "happy",
      angry: process.env.VTS_HOTKEY_ANGRY ?? "angry",
      approval: process.env.VTS_HOTKEY_APPROVAL ?? "approval",
      excited: process.env.VTS_HOTKEY_EXCITED ?? "excited",
      sad: process.env.VTS_HOTKEY_SAD ?? "sad",
      shocked: process.env.VTS_HOTKEY_SHOCKED ?? "shocked",
      embarrassed: process.env.VTS_HOTKEY_EMBARRASSED ?? "embarrassed",
      wink: process.env.VTS_HOTKEY_WINK ?? "wink"
    };
  }

  async connect(): Promise<void> {
    if (this.connected && this.authenticated) {
      return;
    }

    this.socket = new WebSocket(this.wsUrl);

    await new Promise<void>((resolve, reject) => {
      this.socket?.once("open", () => {
        this.connected = true;
        console.info("[VTubeStudioAdapter] connected", { wsUrl: this.wsUrl });
        resolve();
      });
      this.socket?.once("error", (error) => {
        this.connected = false;
        reject(error);
      });
      this.socket?.once("close", () => {
        this.connected = false;
        this.authenticated = false;
      });
    });

    await this.authenticate();
  }

  getStatus(): AvatarAdapterStatus {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      activeExpressions: [...this.activeExpressions]
    };
  }

  async resetToDefault(): Promise<void> {
    await this.clearAllExpressions();
    await this.enableExpression("happy");
    console.info("[VTubeStudioAdapter] reset to happy");
  }

  async applyExpressionState(state: AvatarExpressionState): Promise<void> {
    await this.ensureReady();
    await this.resetToDefault();
    if (state.base !== "happy") {
      await this.enableExpression(state.base);
    }

    for (const overlay of state.overlays) {
      await this.enableExpression(overlay);
    }

    console.info("[VTubeStudioAdapter] applied expression", state);
  }

  async clearAllExpressions(): Promise<void> {
    await this.ensureReady();

    const toClear = new Set([
      ...this.activeExpressions,
      "happy",
      "angry",
      "approval",
      "excited",
      "sad",
      "shocked",
      "embarrassed",
      "wink"
    ]);

    for (const expression of toClear) {
      await this.disableExpression(expression as BaseExpression | OverlayExpression);
    }

    this.activeExpressions.clear();
    console.info("[VTubeStudioAdapter] cleared expressions");
  }

  private async authenticate(): Promise<void> {
    await this.ensureSocket();

    if (!this.token) {
      const tokenResponse = await this.sendRequest("AuthenticationTokenRequest", {
        pluginName: this.pluginName,
        pluginDeveloper: this.pluginDeveloper,
        pluginIcon: this.pluginIcon
      });

      this.token = String(tokenResponse.authenticationToken ?? "");
      console.info("[VTubeStudioAdapter] token acquired");
    }

    await this.sendRequest("AuthenticationRequest", {
      pluginName: this.pluginName,
      pluginDeveloper: this.pluginDeveloper,
      authenticationToken: this.token
    });

    this.authenticated = true;
    console.info("[VTubeStudioAdapter] authenticated");
  }

  private async enableExpression(expression: BaseExpression | OverlayExpression): Promise<void> {
    const hotkeyID = this.hotkeys[expression];
    await this.triggerHotkey(hotkeyID);
    this.activeExpressions.add(expression);
  }

  private async disableExpression(expression: BaseExpression | OverlayExpression): Promise<void> {
    const hotkeyID = this.hotkeys[expression];
    await this.triggerHotkey(hotkeyID);
    this.activeExpressions.delete(expression);
  }

  private async triggerHotkey(hotkeyID: string): Promise<void> {
    await this.sendRequest("HotkeyTriggerRequest", { hotkeyID });
    console.info("[VTubeStudioAdapter] hotkey triggered", { hotkeyID });
  }

  private async sendRequest(messageType: string, data?: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.ensureSocket();

    const requestID = `${messageType}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const payload: VtsEnvelope = {
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      requestID,
      messageType,
      data
    };

    return await new Promise((resolve, reject) => {
      const onMessage = (buffer: WebSocket.RawData) => {
        try {
          const message = JSON.parse(buffer.toString()) as {
            messageType?: string;
            requestID?: string;
            data?: Record<string, unknown>;
          };

          if (message.requestID === requestID || message.messageType?.endsWith("Response")) {
            this.socket?.off("message", onMessage);
            resolve(message.data ?? {});
          }
        } catch (error) {
          this.socket?.off("message", onMessage);
          reject(error);
        }
      };

      this.socket?.on("message", onMessage);
      this.socket?.send(JSON.stringify(payload), (error) => {
        if (error) {
          this.socket?.off("message", onMessage);
          reject(error);
        }
      });
    });
  }

  private async ensureReady(): Promise<void> {
    if (!this.connected || !this.authenticated) {
      await this.connect();
    }
  }

  private async ensureSocket(): Promise<void> {
    if (!this.socket || !this.connected) {
      throw new Error("VTube Studio socket is not connected");
    }
  }
}
