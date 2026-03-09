import { z } from "zod";

export const baseExpressionSchema = z.enum([
  "happy",
  "angry",
  "approval",
  "excited",
  "sad",
  "shocked"
]);

export const overlayExpressionSchema = z.enum(["embarrassed", "wink"]);

export const avatarExpressionStateSchema = z.object({
  base: baseExpressionSchema,
  overlays: z.array(overlayExpressionSchema).default([]),
  durationMs: z.number().int().positive().optional()
});

export const internalEmotionSchema = z.enum([
  "neutral",
  "happy",
  "angry",
  "pouting",
  "embarrassed",
  "excited",
  "sad",
  "shocked",
  "wink"
]);

export type BaseExpression = z.infer<typeof baseExpressionSchema>;
export type OverlayExpression = z.infer<typeof overlayExpressionSchema>;
export type AvatarExpressionState = z.infer<typeof avatarExpressionStateSchema>;
export type InternalEmotion = z.infer<typeof internalEmotionSchema>;

export type AvatarStatus = {
  connected: boolean;
  authenticated: boolean;
  currentState: AvatarExpressionState;
  activeTimers: Partial<Record<OverlayExpression | "shocked", number>>;
};
