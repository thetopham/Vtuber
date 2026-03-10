import {
  avatarExpressionStateSchema,
  avatarToggles,
  internalEmotions,
  type PerformanceIntent
} from "@vtuber/shared";
import emotionMap from "../config/emotion-map.json";

const emotionEnum = [...internalEmotions];
const avatarToggleEnum = [...avatarToggles];

export const performanceIntentJsonSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    shouldSpeak: { type: "boolean" },
    spokenText: { type: "string", minLength: 0, maxLength: 240 },
    emotion: {
      type: ["string", "null"],
      enum: emotionEnum
    },
    expressionState: {
      type: "object",
      additionalProperties: false,
      properties: {
        active: {
          type: "array",
          items: {
            type: "string",
            enum: avatarToggleEnum
          },
          minItems: 1
        }
      },
      required: ["active"]
    },
    notes: { type: "string", minLength: 1, maxLength: 200 }
  },
  required: ["shouldSpeak", "spokenText", "emotion", "expressionState", "notes"]
} as const;

export function normalizeIntent(intent: PerformanceIntent): PerformanceIntent {
  const normalizedSpokenText = intent.shouldSpeak ? intent.spokenText.trim().slice(0, 240) : "";
  const fallbackExpressionState = avatarExpressionStateSchema.parse(
    emotionMap[intent.emotion as keyof typeof emotionMap]
  );

  return {
    ...intent,
    spokenText: normalizedSpokenText,
    expressionState: intent.expressionState
      ? avatarExpressionStateSchema.parse(intent.expressionState)
      : fallbackExpressionState,
    ...(intent.notes?.trim() ? { notes: intent.notes.trim() } : {})
  };
}
