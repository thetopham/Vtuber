import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  DEFAULT_CONTROLLER_PORT,
  DEFAULT_WS_PATH,
  defaultOverlayState,
  eventSchemas,
  type EventName,
  type EventPayloadMap,
  type MultiOverlayState,
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

function isMultiOverlayState(value: OverlayState | MultiOverlayState): value is MultiOverlayState {
  return "stage" in value;
}

export function App() {
  const [overlayState, setOverlayState] = useState<OverlayState>(defaultOverlayState);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [debugOpen, setDebugOpen] = useState(false);
  const [lastEvent, setLastEvent] = useState<OverlayEvent | null>(null);

  const wsUrl = useMemo(() => getWsUrl(), []);

  useEffect(() => {
    const socket = new WebSocket(wsUrl);

    socket.addEventListener("open", () => {
      setConnection("connected");
    });

    socket.addEventListener("close", () => {
      setConnection("disconnected");
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

        applyEventToState(parsed, setOverlayState);
      } catch (error) {
        console.error("Failed to parse incoming WS event", error);
      }
    });

    return () => {
      socket.close();
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
    payload: schema.parse(event.payload) as EventPayloadMap[EventName],
    timestamp: event.timestamp
  } as OverlayEvent;
}

function applyEventToState(
  event: OverlayEvent,
  setOverlayState: Dispatch<SetStateAction<OverlayState>>
): void {
  setOverlayState((prev) => {
    switch (event.type) {
      case "state.sync":
        return isMultiOverlayState(event.payload) ? event.payload.legacy : event.payload;
      case "subtitle.set":
        return {
          ...prev,
          subtitle: event.payload.text,
          characterName: event.payload.characterName ?? prev.characterName
        };
      case "speaking.set":
        return {
          ...prev,
          speaking: event.payload.speaking
        };
      case "emotion.set":
        return {
          ...prev,
          emotion: event.payload.emotion
        };
      case "status.set":
        return {
          ...prev,
          status: event.payload.status
        };
      case "scene.set":
        return {
          ...prev,
          scene: event.payload.scene
        };
      case "state.set":
        return {
          ...prev,
          state: event.payload.state
        };
      case "speech.started":
      case "speech.finished":
        return prev;
      default:
        return prev;
    }
  });
}
