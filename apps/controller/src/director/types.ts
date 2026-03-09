import { z } from "zod";
import { respondRequestSchema, type RespondRequest } from "@vtuber/shared";

export type DirectorInput =
  | { kind: "chat"; text: string; username?: string }
  | { kind: "operator"; text: string }
  | { kind: "performer_line"; fromPerformerId: string; text: string }
  | { kind: "event"; eventType: string; summary: string };

export const directorTextInputSchema = z.object({
  text: z.string().trim().min(1).max(500),
  username: z.string().trim().min(1).max(80).optional()
});

export function toRespondRequest(input: DirectorInput): RespondRequest {
  switch (input.kind) {
    case "chat":
      return {
        inputType: "event",
        event: {
          type: "chat.message",
          summary: `${input.username ? `${input.username}: ` : ""}${input.text}`
        }
      };
    case "operator":
      return { inputType: "manual", text: input.text };
    case "performer_line":
      return {
        inputType: "event",
        event: {
          type: "performer.reply",
          summary: `${input.fromPerformerId} said: ${input.text}`
        }
      };
    case "event":
      return { inputType: "event", event: { type: input.eventType, summary: input.summary } };
    default:
      return respondRequestSchema.parse(input);
  }
}
