import { useEffect, useRef, useState } from 'react';

type UseControllerSocketArgs = {
  url: string;
  onMessage: (payload: unknown) => void;
};

export const useControllerSocket = ({ url, onMessage }: UseControllerSocketArgs) => {
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const onMessageRef = useRef(onMessage);

  onMessageRef.current = onMessage;

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: number | null = null;

    const connect = () => {
      socket = new WebSocket(url);

      socket.addEventListener('open', () => setConnected(true));
      socket.addEventListener('close', () => {
        setConnected(false);
        retry = window.setTimeout(connect, 1500);
      });

      socket.addEventListener('message', (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          const eventType = typeof payload?.type === 'string' ? payload.type : 'unknown';
          setLastEvent(eventType);
          onMessageRef.current(payload);
        } catch {
          setLastEvent('parse.error');
        }
      });
    };

    connect();

    return () => {
      if (retry) window.clearTimeout(retry);
      socket?.close();
    };
  }, [url]);

  return {
    connected,
    lastEvent,
  };
};
