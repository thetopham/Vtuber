import { z } from "zod";
import { performanceIntentSchema, type PerformanceIntent } from "./ai";

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

export type RespondRequest = z.infer<typeof respondRequestSchema>;
export type OrchestrationInputEvent = z.infer<typeof orchestrationEventSchema>;
export { performanceIntentSchema, type PerformanceIntent };
