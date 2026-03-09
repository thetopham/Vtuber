import { z } from "zod";
import { EMOTIONS } from "./constants";

export const performanceIntentSchema = z.object({
  shouldSpeak: z.boolean(),
  spokenText: z.string().min(0).max(240),
  emotion: z.enum(EMOTIONS),
  notes: z.string().min(1).max(200).optional()
}).strict().superRefine((value, ctx) => {
  if (value.shouldSpeak && value.spokenText.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["spokenText"],
      message: "spokenText is required when shouldSpeak is true"
    });
  }
});

export const orchestrationManualInputSchema = z.object({
  inputType: z.literal("manual"),
  text: z.string().min(1).max(500)
}).strict();

export const orchestrationEventSchema = z.object({
  type: z.string().min(1).max(120),
  summary: z.string().min(1).max(500)
}).strict();

export const orchestrationEventInputSchema = z.object({
  inputType: z.literal("event"),
  event: orchestrationEventSchema
}).strict();

export const respondRequestSchema = z.discriminatedUnion("inputType", [
  orchestrationManualInputSchema,
  orchestrationEventInputSchema
]);

export type PerformanceIntent = z.infer<typeof performanceIntentSchema>;
export type RespondRequest = z.infer<typeof respondRequestSchema>;
export type OrchestrationInputEvent = z.infer<typeof orchestrationEventSchema>;
