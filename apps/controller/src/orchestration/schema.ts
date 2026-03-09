import type { PerformanceIntent } from "@vtuber/shared";

export const performanceIntentJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    shouldSpeak: { type: "boolean" },
    spokenText: { type: "string", minLength: 0, maxLength: 240 },
    emotion: {
      type: "string",
      enum: ["neutral", "happy", "angry", "pouting", "embarrassed", "excited", "sad", "shocked", "wink"]
    },
    notes: { type: "string", minLength: 1, maxLength: 200 }
  },
  required: ["shouldSpeak", "spokenText", "emotion", "notes"]
} as const;

export function normalizeIntent(intent: PerformanceIntent): PerformanceIntent {
  if (!intent.shouldSpeak && intent.spokenText.length > 0) {
    return {
      ...intent,
      spokenText: ""
    };
  }

  return intent;
}
