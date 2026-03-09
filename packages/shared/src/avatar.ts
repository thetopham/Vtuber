import { z } from "zod";

export const avatarToggles = [
  "angry",
  "approval",
  "embarrassed",
  "excited",
  "happy",
  "neutral",
  "sad",
  "shocked",
  "wink"
] as const;

export type AvatarToggle = (typeof avatarToggles)[number];

export type AvatarToggleMetadata = {
  name: AvatarToggle;
  displayName: string;
  visualDescription: string;
  useFor: string[];
  avoidFor: string[];
  combinesWellWith: AvatarToggle[];
  conflictsWith: AvatarToggle[];
  tags: string[];
};

export const avatarToggleMetadata: AvatarToggleMetadata[] = [
  {
    name: "angry",
    displayName: "angry",
    visualDescription:
      "Mild irritated pout with tension under the eye; reads as annoyed, offended, or salty rather than full rage.",
    useFor: ["annoyed", "irritated", "defensive", "grumpy", "salty"],
    avoidFor: ["screaming rage", "high-energy aggression"],
    combinesWellWith: ["wink"],
    conflictsWith: ["happy", "neutral"],
    tags: ["angry", "annoyed", "grumpy", "offended"]
  },
  {
    name: "approval",
    displayName: "composed",
    visualDescription:
      "Eyes closed with a calm pout; reads as composed, reserved, reflective, mildly smug, or quietly unimpressed.",
    useFor: ["composed", "reserved", "reflective", "quiet confidence", "hm"],
    avoidFor: ["enthusiastic approval", "high-energy praise"],
    combinesWellWith: ["wink"],
    conflictsWith: ["shocked", "neutral"],
    tags: ["composed", "reserved", "thinking", "smug", "calm"]
  },
  {
    name: "embarrassed",
    displayName: "embarrassed",
    visualDescription: "Blushing shy smile; reads as bashful, flattered, affectionate, and awkward-positive.",
    useFor: ["bashful", "flattered", "shy", "affectionate", "touched"],
    avoidFor: ["deep shame", "panic", "sadness"],
    combinesWellWith: ["happy", "excited", "wink"],
    conflictsWith: ["neutral"],
    tags: ["embarrassed", "shy", "bashful", "flattered", "cute"]
  },
  {
    name: "excited",
    displayName: "starstruck",
    visualDescription:
      "Star-eye look with flatter mouth; reads as dazzled, captivated, impressed, or focused rather than generic excitement.",
    useFor: ["amazed", "impressed", "captivated", "fascinated", "locked-in"],
    avoidFor: ["laughing hype", "celebration", "big cheerful energy"],
    combinesWellWith: ["embarrassed", "wink"],
    conflictsWith: ["sad", "neutral"],
    tags: ["starstruck", "amazed", "captivated", "focused", "impressed"]
  },
  {
    name: "happy",
    displayName: "happy",
    visualDescription: "Gentle friendly smile; best default positive conversational expression.",
    useFor: ["friendly", "warm", "pleased", "casual positivity"],
    avoidFor: ["extreme excitement", "bashful flirting"],
    combinesWellWith: ["embarrassed", "wink"],
    conflictsWith: ["angry", "sad", "neutral"],
    tags: ["happy", "friendly", "warm", "positive"]
  },
  {
    name: "neutral",
    displayName: "neutral",
    visualDescription: "Low-intensity resting face for idle, listening, and transitions.",
    useFor: ["idle", "listening", "baseline", "narration", "transition"],
    avoidFor: ["emotionally important beats"],
    combinesWellWith: [],
    conflictsWith: ["angry", "approval", "embarrassed", "excited", "happy", "sad", "shocked", "wink"],
    tags: ["neutral", "idle", "baseline", "listening"]
  },
  {
    name: "sad",
    displayName: "sad",
    visualDescription:
      "Worried pout and slightly fragile expression; reads as disappointed, uneasy, apologetic, or slightly hurt.",
    useFor: ["disappointed", "uneasy", "apologetic", "worried", "hurt"],
    avoidFor: ["heavy grief", "tragedy"],
    combinesWellWith: ["embarrassed"],
    conflictsWith: ["happy", "excited", "neutral"],
    tags: ["sad", "worried", "disappointed", "apologetic", "uneasy"]
  },
  {
    name: "shocked",
    displayName: "shocked",
    visualDescription: "Wide eye and open mouth; very strong surprise/startle reaction.",
    useFor: ["surprised", "stunned", "startled", "caught off guard"],
    avoidFor: ["mild curiosity", "subtle confusion"],
    combinesWellWith: ["embarrassed"],
    conflictsWith: ["approval", "neutral"],
    tags: ["shocked", "surprised", "stunned", "startled"]
  },
  {
    name: "wink",
    displayName: "coy",
    visualDescription:
      "Because the hair covers one eye, this reads more like a coy playful lean/pose than a literal wink.",
    useFor: ["teasing", "cheeky", "playful", "coy", "flirty"],
    avoidFor: ["literal wink signaling", "serious moments"],
    combinesWellWith: ["happy", "embarrassed", "excited", "approval", "angry"],
    conflictsWith: ["neutral"],
    tags: ["coy", "playful", "teasing", "lean", "cheeky"]
  }
];

export const internalEmotions = [
  "neutral",
  "happy",
  "angry",
  "pouting",
  "embarrassed",
  "excited",
  "sad",
  "shocked",
  "wink"
] as const;

export type InternalEmotion = (typeof internalEmotions)[number];

export type AvatarExpressionState = {
  active: AvatarToggle[];
  durationMs?: number;
};

export const avatarExpressionStateSchema = z.object({
  active: z.array(z.enum(avatarToggles)).default([]),
  durationMs: z.number().int().positive().optional()
});

export const emotionInputSchema = z.object({
  emotion: z.enum(internalEmotions)
});

export const expressionInputSchema = avatarExpressionStateSchema;
