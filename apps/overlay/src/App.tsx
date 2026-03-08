import { useMemo, useState } from 'react';
import { DEFAULT_OVERLAY_STATE, outboundEventSchema, type OverlayState } from '@vtuber/shared';
import { useControllerSocket } from './useControllerSocket';

const wsUrl = import.meta.env.VITE_CONTROLLER_WS_URL ?? 'ws://localhost:4000/ws';
const isDemoMode = new URLSearchParams(window.location.search).get('demo') === '1';

export const App = () => {
  const [state, setState] = useState<OverlayState>(DEFAULT_OVERLAY_STATE);
  const [debugOpen, setDebugOpen] = useState(false);

  const { connected, lastEvent } = useControllerSocket({
    url: wsUrl,
    onMessage: (raw) => {
      const parsed = outboundEventSchema.safeParse(raw);
      if (!parsed.success) return;

      const evt = parsed.data;
      switch (evt.type) {
        case 'subtitle.set':
          setState((prev) => ({ ...prev, subtitle: evt.payload.text }));
          break;
        case 'speaking.set':
          setState((prev) => ({ ...prev, speaking: evt.payload.speaking }));
          break;
        case 'emotion.set':
          setState((prev) => ({ ...prev, emotion: evt.payload.emotion }));
          break;
        case 'status.set':
          setState((prev) => ({ ...prev, status: evt.payload.status }));
          break;
        case 'scene.set':
          setState((prev) => ({ ...prev, scene: evt.payload.scene }));
          break;
        case 'state.snapshot':
          setState(evt.payload);
          break;
      }
    },
  });

  const speakingClass = useMemo(() => (state.speaking ? 'is-speaking' : ''), [state.speaking]);

  return (
    <main className={`overlay-root ${speakingClass}`}>
      <header className="top-row">
        <div className="name-pill">{state.characterName}</div>
        <div className={`status-pill ${connected ? 'online' : 'offline'}`}>
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>
      </header>

      <section className="hud-row">
        <div className={`speaking-indicator ${state.speaking ? 'active' : ''}`}>{state.speaking ? 'Speaking' : 'Idle'}</div>
        <div className="emotion-badge">Emotion: {state.emotion}</div>
      </section>

      <section className="subtitle-wrap">
        <p className="subtitle">{state.subtitle}</p>
      </section>

      <button className="debug-toggle" onClick={() => setDebugOpen((prev) => !prev)}>
        {debugOpen ? 'Hide Debug' : 'Show Debug'}
      </button>

      {debugOpen ? (
        <aside className="debug-panel">
          <h2>Overlay Debug</h2>
          <p>WebSocket: {wsUrl}</p>
          <p>Connected: {String(connected)}</p>
          <p>Status: {state.status}</p>
          <p>Scene: {state.scene}</p>
          <p>Last Event: {lastEvent ?? 'none'}</p>
          <p>Test page: open <code>/ ?demo=1</code> for local UI controls.</p>

          {isDemoMode ? (
            <div className="demo-actions">
              <button onClick={() => setState((s) => ({ ...s, speaking: !s.speaking }))}>Toggle Speaking</button>
              <button onClick={() => setState((s) => ({ ...s, emotion: 'happy', subtitle: 'Demo: happy response.' }))}>Happy line</button>
              <button onClick={() => setState((s) => ({ ...s, emotion: 'thinking', subtitle: 'Demo: evaluating options...' }))}>Thinking line</button>
            </div>
          ) : null}
        </aside>
      ) : null}
    </main>
  );
};
