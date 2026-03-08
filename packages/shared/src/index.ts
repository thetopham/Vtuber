import { z } from 'zod';

export const EMOTIONS = ['neutral', 'happy', 'angry', 'sad', 'surprised', 'thinking'] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const OverlayStateSchema = z.object({
  characterName: z.string().default('Astra'),
  subtitle: z.string().default(''),
  speaking: z.boolean().default(false),
  emotion: z.enum(EMOTIONS).default('neutral'),
  status: z.string().default('idle'),
  scene: z.string().default('default')
});

export type OverlayState = z.infer<typeof OverlayStateSchema>;

export const DEFAULT_STATE: OverlayState = {
  characterName: 'Astra',
  subtitle: 'Controller connected. Waiting for events…',
  speaking: false,
  emotion: 'neutral',
  status: 'idle',
  scene: 'default'
};

export const subtitleSetSchema = z.object({
  subtitle: z.string().min(1),
  characterName: z.string().optional()
});

export const speakingSetSchema = z.object({ speaking: z.boolean() });
export const emotionSetSchema = z.object({ emotion: z.enum(EMOTIONS) });
export const statusSetSchema = z.object({ status: z.string().min(1) });
export const sceneSetSchema = z.object({ scene: z.string().min(1) });

export type EventPayloadMap = {
  'subtitle.set': z.infer<typeof subtitleSetSchema>;
  'speaking.set': z.infer<typeof speakingSetSchema>;
  'emotion.set': z.infer<typeof emotionSetSchema>;
  'status.set': z.infer<typeof statusSetSchema>;
  'scene.set': z.infer<typeof sceneSetSchema>;
};

export type EventType = keyof EventPayloadMap;

export type ControllerEvent = {
  [K in EventType]: {
    type: K;
    payload: EventPayloadMap[K];
    timestamp: string;
  };
}[EventType];

export const SocketEnvelopeSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('state.snapshot'), payload: OverlayStateSchema, timestamp: z.string() }),
  z.object({ type: z.literal('subtitle.set'), payload: subtitleSetSchema, timestamp: z.string() }),
  z.object({ type: z.literal('speaking.set'), payload: speakingSetSchema, timestamp: z.string() }),
  z.object({ type: z.literal('emotion.set'), payload: emotionSetSchema, timestamp: z.string() }),
  z.object({ type: z.literal('status.set'), payload: statusSetSchema, timestamp: z.string() }),
  z.object({ type: z.literal('scene.set'), payload: sceneSetSchema, timestamp: z.string() })
]);

export type SocketEnvelope = z.infer<typeof SocketEnvelopeSchema>;

export const envSchema = z.object({
  CONTROLLER_PORT: z.coerce.number().default(8787),
  CORS_ORIGIN: z.string().default('*')
});
