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

export const BASE_EXPRESSIONS = [
  "happy",
  "angry",
  "approval",
  "excited",
  "sad",
  "shocked"
] as const;

export const OVERLAY_EXPRESSIONS = ["embarrassed", "wink"] as const;

export type InternalEmotion = (typeof INTERNAL_EMOTIONS)[number];
export type BaseExpression = (typeof BASE_EXPRESSIONS)[number];
export type OverlayExpression = (typeof OVERLAY_EXPRESSIONS)[number];

export type AvatarExpressionState = {
  base: BaseExpression;
  overlays: OverlayExpression[];
  durationMs?: number;
};

export const internalEmotionSchema = z.enum(INTERNAL_EMOTIONS);
export const baseExpressionSchema = z.enum(BASE_EXPRESSIONS);
export const overlayExpressionSchema = z.enum(OVERLAY_EXPRESSIONS);

export const avatarExpressionStateSchema = z.object({
  base: baseExpressionSchema,
  overlays: z.array(overlayExpressionSchema).default([]),
  durationMs: z.number().int().positive().optional()
});

export type AvatarAdapterStatus = {
  connected: boolean;
  authenticated: boolean;
  activeState: AvatarExpressionState;
  activeTimers: Partial<Record<OverlayExpression | "shocked", number>>;
};
