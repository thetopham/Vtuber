import { z } from 'zod';
import { EMOTIONS } from './constants.js';

export const subtitlePayloadSchema = z.object({
  text: z.string().min(1).max(280),
  source: z.string().optional(),
});

export const speakingPayloadSchema = z.object({
  speaking: z.boolean(),
});

export const emotionPayloadSchema = z.object({
  emotion: z.enum(EMOTIONS),
});

export const statusPayloadSchema = z.object({
  status: z.string().min(1).max(64),
  details: z.string().max(280).optional(),
});

export const scenePayloadSchema = z.object({
  scene: z.string().min(1).max(64),
});

export const overlayStateSchema = z.object({
  subtitle: z.string(),
  speaking: z.boolean(),
  emotion: z.enum(EMOTIONS),
  status: z.string(),
  scene: z.string(),
  characterName: z.string(),
});

export const outboundEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subtitle.set'), payload: subtitlePayloadSchema }),
  z.object({ type: z.literal('speaking.set'), payload: speakingPayloadSchema }),
  z.object({ type: z.literal('emotion.set'), payload: emotionPayloadSchema }),
  z.object({ type: z.literal('status.set'), payload: statusPayloadSchema }),
  z.object({ type: z.literal('scene.set'), payload: scenePayloadSchema }),
  z.object({ type: z.literal('state.snapshot'), payload: overlayStateSchema }),
]);

export type SubtitlePayload = z.infer<typeof subtitlePayloadSchema>;
export type SpeakingPayload = z.infer<typeof speakingPayloadSchema>;
export type EmotionPayload = z.infer<typeof emotionPayloadSchema>;
export type StatusPayload = z.infer<typeof statusPayloadSchema>;
export type ScenePayload = z.infer<typeof scenePayloadSchema>;
export type OverlayState = z.infer<typeof overlayStateSchema>;
export type OutboundEvent = z.infer<typeof outboundEventSchema>;
