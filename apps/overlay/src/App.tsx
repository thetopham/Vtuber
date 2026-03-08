import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_STATE,
  type OverlayState,
  SocketEnvelopeSchema,
  type SocketEnvelope
} from '@vtuber/shared';

const getWsUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('ws');
  if (fromQuery) return fromQuery;
  return `ws://${window.location.hostname || 'localhost'}:8787`;
};

const applyEvent = (current: OverlayState, msg: SocketEnvelope): OverlayState => {
  if (msg.type === 'state.snapshot') return msg.payload;
  if (msg.type === 'subtitle.set') return { ...current, ...msg.payload };
  if (msg.type === 'speaking.set') return { ...current, ...msg.payload };
  if (msg.type === 'emotion.set') return { ...current, ...msg.payload };
  if (msg.type === 'status.set') return { ...current, ...msg.payload };
  if (msg.type === 'scene.set') return { ...current, ...msg.payload };
  return current;
};

export default function App() {
  const [state, setState] = useState<OverlayState>(DEFAULT_STATE);
  const [debugOpen, setDebugOpen] = useState(false);
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'closed'>('connecting');
  const wsUrl = useMemo(() => getWsUrl(), []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);

    ws.addEventListener('open', () => setSocketStatus('connected'));
    ws.addEventListener('close', () => setSocketStatus('closed'));

    ws.addEventListener('message', (event) => {
      const json = JSON.parse(event.data);
      const parsed = SocketEnvelopeSchema.safeParse(json);
      if (!parsed.success) return;
      setState((prev) => applyEvent(prev, parsed.data));
    });

    return () => ws.close();
  }, [wsUrl]);

  return (
    <main className={`overlay ${state.speaking ? 'is-speaking' : ''}`}>
      <section className="top-right">
        <button className="debug-toggle" onClick={() => setDebugOpen((prev) => !prev)}>
          {debugOpen ? 'Hide' : 'Show'} Debug
        </button>
      </section>

      {debugOpen && (
        <aside className="debug-panel">
          <h3>Overlay Debug</h3>
          <p>WebSocket: {socketStatus}</p>
          <p>WS URL: {wsUrl}</p>
          <pre>{JSON.stringify(state, null, 2)}</pre>
        </aside>
      )}

      <section className="subtitle-wrapper">
        <div className="meta-row">
          <span className="name-pill">{state.characterName}</span>
          <span className={`speaking-pill ${state.speaking ? 'live' : ''}`}>
            {state.speaking ? 'Speaking' : 'Idle'}
          </span>
          <span className={`emotion-pill emotion-${state.emotion}`}>{state.emotion}</span>
        </div>

        <p className="subtitle-text">{state.subtitle}</p>
        <div className="status-row">
          <span>Status: {state.status}</span>
          <span>Scene: {state.scene}</span>
        </div>
      </section>
    </main>
  );
}
