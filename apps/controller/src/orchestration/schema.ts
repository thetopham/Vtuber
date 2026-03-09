import { avatarExpressionStateSchema, type PerformanceIntent } from "@vtuber/shared";
import emotionMap from "../config/emotion-map.json";


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
    expressionState: {
      type: "object",
      additionalProperties: false,
      properties: {
        active: {
          type: "array",
          items: {
            type: "string",
            enum: ["angry", "approval", "embarrassed", "excited", "happy", "neutral", "sad", "shocked", "wink"]
          }
        },
        durationMs: { type: "integer", minimum: 1 }
      },
      required: ["active", "durationMs"]
    },
    notes: { type: "string", minLength: 1, maxLength: 200 }
  },
  required: ["shouldSpeak", "spokenText", "emotion", "expressionState", "notes"]
} as const;

export function normalizeIntent(intent: PerformanceIntent): PerformanceIntent {
  const normalizedSpokenText = !intent.shouldSpeak && intent.spokenText.length > 0 ? "" : intent.spokenText;
  const fallbackExpressionState = avatarExpressionStateSchema.parse(
    emotionMap[intent.emotion as keyof typeof emotionMap]
  );

  return {
    ...intent,
    spokenText: normalizedSpokenText,
    expressionState: intent.expressionState ?? fallbackExpressionState
  };
}
