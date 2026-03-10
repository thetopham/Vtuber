import { z } from "zod";
import { EMOTIONS } from "./constants";
import { avatarExpressionStateSchema } from "./avatar";

export const speechRequestSchema = z.object({
  text: z.string().min(1).max(400),
  emotion: z.enum(EMOTIONS),
  expressionState: avatarExpressionStateSchema.optional()
});

export const speechStatusSchema = z.object({
  isPlaying: z.boolean(),
  lastSpokenText: z.string().nullable(),
  lastRequestedEmotion: z.enum(EMOTIONS).nullable(),
  controllerState: z.string(),
  lastAudioFilePath: z.string().nullable()
});

export type SpeechRequest = z.infer<typeof speechRequestSchema>;
export type SpeechStatus = z.infer<typeof speechStatusSchema>;
