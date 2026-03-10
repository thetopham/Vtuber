import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_CONTROLLER_PORT,
  DEFAULT_WS_PATH,
  defaultOverlayState,
  eventSchemas,
  reduceOverlayState,
  type EventName,
  type OverlayEvent,
  type OverlayState
} from "@vtuber/shared";

type ConnectionState = "connecting" | "connected" | "disconnected";

function getWsUrl(): string {
  const host = window.location.hostname || "localhost";
  const port = import.meta.env.VITE_CONTROLLER_PORT ?? String(DEFAULT_CONTROLLER_PORT);
  const wsPath = import.meta.env.VITE_WS_PATH ?? DEFAULT_WS_PATH;
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${host}:${port}${wsPath}`;
}

export function App() {
  const [overlayState, setOverlayState] = useState<OverlayState>(defaultOverlayState);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<OverlayEvent | null>(null);

  const wsUrl = useMemo(() => getWsUrl(), []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let disposed = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimer !== null) {
        return;
      }

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, 1500);
    };

    const connect = () => {
      if (disposed) {
        return;
      }

      setConnection("connecting");
      socket = new WebSocket(wsUrl);

      socket.addEventListener("open", () => {
        if (!disposed) {
          setConnection("connected");
        }
      });

      socket.addEventListener("close", () => {
        if (disposed) {
          return;
        }

        setConnection("disconnected");
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        socket?.close();
      });

      socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data) as {
            type: EventName;
            payload: unknown;
            timestamp: number;
          };
          const parsed = parseIncomingEvent(message);
          setLastEvent(parsed);
          setOverlayState((prev) => reduceOverlayState(prev, parsed));
        } catch (error) {
          console.error("Failed to parse incoming WS event", error);
        }
      });
    };

    connect();

    return () => {
      disposed = true;
      clearReconnectTimer();
      socket?.close();
    };
  }, [wsUrl]);

  return (
    <main className={`overlay-root ${overlayState.speaking ? "is-speaking" : ""}`}>
      <div className="top-left-status">
        <span className={`dot dot-${connection}`} />
        <span>{connection}</span>
      </div>

      <button className="debug-toggle" onClick={() => setDebugOpen((prev) => !prev)}>
        {debugOpen ? "Hide Debug" : "Show Debug"}
      </button>

      <section className="subtitle-shell">
        <div className="meta-row">
          <span className="character-name">{overlayState.characterName}</span>
          <span className={`speaking-pill ${overlayState.speaking ? "active" : "idle"}`}>
            {overlayState.speaking ? "Speaking" : "Listening"}
          </span>
          <span className="emotion-badge">{overlayState.emotion}</span>
        </div>
        <p className="subtitle-text">{overlayState.subtitle}</p>
      </section>

      {debugOpen && (
        <aside className="debug-panel">
          <h2>Debug Panel</h2>
          <p>Scene: {overlayState.scene}</p>
          <p>Status: {overlayState.status}</p>
          <p>State: {overlayState.state}</p>
          <p>WS: {wsUrl}</p>
          <pre>{JSON.stringify(lastEvent, null, 2)}</pre>
        </aside>
      )}
    </main>
  );
}

function parseIncomingEvent(event: {
  type: EventName;
  payload: unknown;
  timestamp: number;
}): OverlayEvent {
  const schema = eventSchemas[event.type];

  if (!schema) {
    throw new Error(`Unknown event type: ${event.type}`);
  }

  return {
    type: event.type,
    payload: schema.parse(event.payload),
    timestamp: event.timestamp
  } as OverlayEvent;
}
