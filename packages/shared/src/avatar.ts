import { z } from "zod";

export const INTERNAL_EMOTIONS = [
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

export type InternalEmotion = (typeof INTERNAL_EMOTIONS)[number];

export const BASE_EXPRESSIONS = [
  "happy",
  "angry",
  "approval",
  "excited",
  "sad",
  "shocked"
] as const;

export type BaseExpression = (typeof BASE_EXPRESSIONS)[number];

export const OVERLAY_EXPRESSIONS = ["embarrassed", "wink"] as const;

export type OverlayExpression = (typeof OVERLAY_EXPRESSIONS)[number];

export type AvatarExpressionState = {
  base: BaseExpression;
  overlays: OverlayExpression[];
  durationMs?: number;
};

export const avatarExpressionStateSchema = z.object({
  base: z.enum(BASE_EXPRESSIONS),
  overlays: z.array(z.enum(OVERLAY_EXPRESSIONS)).default([]),
  durationMs: z.number().int().positive().optional()
});

export const avatarEmotionRequestSchema = z.object({
  emotion: z.enum(INTERNAL_EMOTIONS)
});

export const avatarExpressionRequestSchema = avatarExpressionStateSchema;
