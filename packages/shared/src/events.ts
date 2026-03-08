import { z } from "zod";
import { DEFAULT_STATE, EMOTIONS } from "./constants.js";

const emotionSchema = z.enum(EMOTIONS);

export const subtitleSetSchema = z.object({
  event: z.literal("subtitle.set"),
  data: z.object({
    subtitle: z.string().min(1).max(300)
  })
});

export const speakingSetSchema = z.object({
  event: z.literal("speaking.set"),
  data: z.object({
    speaking: z.boolean()
  })
});

export const emotionSetSchema = z.object({
  event: z.literal("emotion.set"),
  data: z.object({
    emotion: emotionSchema
  })
});

export const statusSetSchema = z.object({
  event: z.literal("status.set"),
  data: z.object({
    status: z.string().min(1).max(120)
  })
});

export const sceneSetSchema = z.object({
  event: z.literal("scene.set"),
  data: z.object({
    scene: z.string().min(1).max(120)
  })
});

export const controllerEventSchema = z.discriminatedUnion("event", [
  subtitleSetSchema,
  speakingSetSchema,
  emotionSetSchema,
  statusSetSchema,
  sceneSetSchema
]);

export const stateSnapshotSchema = z.object({
  event: z.literal("state.snapshot"),
  data: z.object({
    state: z.object({
      subtitle: z.string(),
      speaking: z.boolean(),
      emotion: emotionSchema,
      status: z.string(),
      scene: z.string(),
      characterName: z.string()
    })
  })
});

export const outboundSocketEventSchema = z.union([controllerEventSchema, stateSnapshotSchema]);

export type ControllerEvent = z.infer<typeof controllerEventSchema>;
export type OutboundSocketEvent = z.infer<typeof outboundSocketEventSchema>;

export const subtitlePayloadSchema = subtitleSetSchema.shape.data;
export const speakingPayloadSchema = speakingSetSchema.shape.data;
export const emotionPayloadSchema = emotionSetSchema.shape.data;
export const statusPayloadSchema = statusSetSchema.shape.data;

export const defaultSnapshot = {
  event: "state.snapshot" as const,
  data: { state: DEFAULT_STATE }
};
