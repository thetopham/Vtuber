import { z } from "zod";

export const baseExpressions = [
  "happy",
  "angry",
  "approval",
  "excited",
  "sad",
  "shocked"
] as const;

export const overlayExpressions = ["embarrassed", "wink"] as const;

export const internalEmotions = [
  "neutral",
  "happy",
  "angry",
  "pouting",
  "embarrassed",
  "excited",
  "sad",
  "shocked",
  "wink"
] as const;

export type BaseExpression = (typeof baseExpressions)[number];
export type OverlayExpression = (typeof overlayExpressions)[number];
export type InternalEmotion = (typeof internalEmotions)[number];

export type AvatarExpressionState = {
  base: BaseExpression;
  overlays: OverlayExpression[];
  durationMs?: number;
};

export const avatarExpressionStateSchema = z.object({
  base: z.enum(baseExpressions),
  overlays: z.array(z.enum(overlayExpressions)).default([]),
  durationMs: z.number().int().positive().optional()
});

export const emotionInputSchema = z.object({
  emotion: z.enum(internalEmotions)
});

export const expressionInputSchema = avatarExpressionStateSchema;
