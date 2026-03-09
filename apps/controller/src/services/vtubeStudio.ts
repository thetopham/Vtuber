import WebSocket from "ws";

type VTSResponse = {
  requestID?: string;
  messageType?: string;
  data?: unknown;
};

export type VTubeStudioClientOptions = {
  url: string;
  pluginName: string;
  pluginDeveloper: string;
  pluginIcon?: string;
  authToken?: string;
};

export class VTubeStudioClient {
  private readonly options: VTubeStudioClientOptions;
  private socket: WebSocket | null = null;
  private connected = false;
  private authenticated = false;
  private authToken: string | undefined;

  public constructor(options: VTubeStudioClientOptions) {
    this.options = options;
    this.authToken = options.authToken;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  public getAuthToken(): string | undefined {
    return this.authToken;
  }

  public async connect(): Promise<void> {
    if (this.connected && this.socket) {
      return;
    }

    this.socket = await new Promise<WebSocket>((resolve, reject) => {
      const socket = new WebSocket(this.options.url);
      socket.once("open", () => resolve(socket));
      socket.once("error", reject);
    });

    this.connected = true;
    this.socket.on("close", () => {
      this.connected = false;
      this.authenticated = false;
    });

    console.info("[VTubeStudioClient] Connected", { url: this.options.url });
  }

  public async disconnect(): Promise<void> {
    if (!this.socket) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.socket?.once("close", () => resolve());
      this.socket?.close();
    });

    this.socket = null;
    this.connected = false;
    this.authenticated = false;
    console.info("[VTubeStudioClient] Disconnected");
  }

  public async authenticate(): Promise<void> {
    if (!this.socket) {
      throw new Error("VTube Studio socket is not connected");
    }

    if (!this.authToken) {
      const tokenData = (await this.sendRequest("AuthenticationTokenRequest", {
        pluginName: this.options.pluginName,
        pluginDeveloper: this.options.pluginDeveloper,
        pluginIcon: this.options.pluginIcon ?? ""
      })) as { authenticationToken?: string };

      this.authToken = tokenData.authenticationToken;
      console.info("[VTubeStudioClient] Received auth token");
    }

    await this.sendRequest("AuthenticationRequest", {
      pluginName: this.options.pluginName,
      pluginDeveloper: this.options.pluginDeveloper,
      authenticationToken: this.authToken
    });

    this.authenticated = true;
    console.info("[VTubeStudioClient] Authenticated");
  }

  public async triggerHotkey(hotkeyID: string): Promise<void> {
    await this.sendRequest("HotkeyTriggerRequest", { hotkeyID });
    console.info("[VTubeStudioClient] Triggered hotkey", { hotkeyID });
  }

  private async sendRequest(messageType: string, data: Record<string, unknown>): Promise<unknown> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("VTube Studio socket is not open");
    }

    const requestID = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const payload = {
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      requestID,
      messageType,
      data
    };

    return await new Promise((resolve, reject) => {
      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(raw.toString()) as VTSResponse;

          if (parsed.requestID !== requestID) {
            return;
          }

          this.socket?.off("message", onMessage);

          if (parsed.messageType === "APIError") {
            reject(new Error(`VTube Studio APIError for ${messageType}: ${JSON.stringify(parsed.data)}`));
            return;
          }

          resolve(parsed.data ?? {});
        } catch (error) {
          this.socket?.off("message", onMessage);
          reject(error);
        }
      };

      this.socket?.on("message", onMessage);
      this.socket?.send(JSON.stringify(payload));
    });
  }
}
