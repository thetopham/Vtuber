import { z } from "zod";
import {
  avatarExpressionStateSchema,
  internalEmotions
} from "./avatar";

export const performanceIntentSchema = z
  .object({
    shouldSpeak: z.boolean(),
    spokenText: z.string().min(0).max(240),
    emotion: z.enum(internalEmotions),
    expressionState: avatarExpressionStateSchema.optional(),
    notes: z.string().min(1).max(200).optional()
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.shouldSpeak && value.spokenText.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["spokenText"],
        message: "spokenText is required when shouldSpeak is true"
      });
    }
  });

export type PerformanceIntent = z.infer<typeof performanceIntentSchema>;
