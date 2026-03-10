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
  requestTimeoutMs?: number;
};

export class VTubeStudioClient {
  private readonly options: VTubeStudioClientOptions;
  private socket: WebSocket | null = null;
  private connected = false;
  private authenticated = false;
  private authToken: string | undefined;
  private requestSequence = 0;

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

    const socket = await new Promise<WebSocket>((resolve, reject) => {
      const candidate = new WebSocket(this.options.url);
      const onOpen = () => {
        candidate.off("error", onError);
        resolve(candidate);
      };
      const onError = (error: Error) => {
        candidate.off("open", onOpen);
        reject(error);
      };

      candidate.once("open", onOpen);
      candidate.once("error", onError);
    });

    this.socket = socket;
    this.connected = true;

    socket.on("error", (error) => {
      console.error("[VTubeStudioClient] Socket error", error);
    });

    socket.on("close", () => {
      this.connected = false;
      this.authenticated = false;
      this.socket = null;
    });

    console.info("[VTubeStudioClient] Connected", { url: this.options.url });
  }

  public async disconnect(): Promise<void> {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    await new Promise<void>((resolve) => {
      socket.once("close", () => resolve());
      socket.close();
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

  private nextRequestId(): string {
    this.requestSequence += 1;
    return `vts-${Date.now()}-${this.requestSequence}`;
  }

  private async sendRequest(messageType: string, data: Record<string, unknown>): Promise<unknown> {
    const socket = this.socket;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("VTube Studio socket is not open");
    }

    const requestID = this.nextRequestId();
    const payload = {
      apiName: "VTubeStudioPublicAPI",
      apiVersion: "1.0",
      requestID,
      messageType,
      data
    };

    return await new Promise((resolve, reject) => {
      let settled = false;
      const timeoutMs = this.options.requestTimeoutMs ?? 10_000;

      const cleanup = () => {
        clearTimeout(timeout);
        socket.off("message", onMessage);
        socket.off("close", onClose);
        socket.off("error", onError);
      };

      const fail = (error: Error) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        reject(error);
      };

      const succeed = (value: unknown) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        resolve(value);
      };

      const onClose = () => {
        fail(new Error(`VTube Studio socket closed while waiting for ${messageType}`));
      };

      const onError = (error: Error) => {
        fail(error);
      };

      const onMessage = (raw: WebSocket.RawData) => {
        try {
          const parsed = JSON.parse(raw.toString()) as VTSResponse;

          if (parsed.requestID !== requestID) {
            return;
          }

          if (parsed.messageType === "APIError") {
            fail(new Error(`VTube Studio APIError for ${messageType}: ${JSON.stringify(parsed.data)}`));
            return;
          }

          succeed(parsed.data ?? {});
        } catch (error) {
          fail(error instanceof Error ? error : new Error(String(error)));
        }
      };

      const timeout = setTimeout(() => {
        fail(new Error(`VTube Studio request timed out after ${timeoutMs}ms: ${messageType}`));
      }, timeoutMs);

      socket.on("message", onMessage);
      socket.once("close", onClose);
      socket.once("error", onError);
      socket.send(JSON.stringify(payload), (error) => {
        if (error) {
          fail(error);
        }
      });
    });
  }
}
