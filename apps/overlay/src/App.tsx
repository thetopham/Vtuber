import { useEffect, useState } from "react";
import { DEFAULT_STATE, outboundSocketEventSchema, type OverlayState } from "@vtuber/shared";

const WS_URL = import.meta.env.VITE_CONTROLLER_WS_URL ?? "ws://localhost:8787";

export function App() {
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE);
  const [debugOpen, setDebugOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    const socket = new WebSocket(WS_URL);

    socket.addEventListener("open", () => setConnectionStatus("connected"));
    socket.addEventListener("close", () => setConnectionStatus("disconnected"));
    socket.addEventListener("message", (message) => {
      const maybePayload = JSON.parse(message.data);
      const payload = outboundSocketEventSchema.parse(maybePayload);

      switch (payload.event) {
        case "state.snapshot":
          setState(payload.data.state);
          break;
        case "subtitle.set":
          setState((prev) => ({ ...prev, subtitle: payload.data.subtitle }));
          break;
        case "speaking.set":
          setState((prev) => ({ ...prev, speaking: payload.data.speaking }));
          break;
        case "emotion.set":
          setState((prev) => ({ ...prev, emotion: payload.data.emotion }));
          break;
        case "status.set":
          setState((prev) => ({ ...prev, status: payload.data.status }));
          break;
        case "scene.set":
          setState((prev) => ({ ...prev, scene: payload.data.scene }));
          break;
      }
    });

    return () => socket.close();
  }, []);

  return (
    <div className={`overlay ${state.speaking ? "is-speaking" : ""}`}>
      <div className="top-bar">
        <div className="pill">{state.characterName}</div>
        <div className="pill">Emotion: {state.emotion}</div>
        <div className={`pill speaking ${state.speaking ? "active" : ""}`}>
          {state.speaking ? "Speaking" : "Listening"}
        </div>
      </div>

      <div className="subtitle-shell">
        <div className="subtitle">{state.subtitle}</div>
      </div>

      <button className="debug-toggle" onClick={() => setDebugOpen((open) => !open)}>
        {debugOpen ? "Hide Debug" : "Show Debug"}
      </button>

      {debugOpen && (
        <aside className="debug-panel">
          <h3>Overlay Debug</h3>
          <pre>{JSON.stringify({ connectionStatus, wsUrl: WS_URL, state }, null, 2)}</pre>
        </aside>
      )}
    </div>
  );
}
