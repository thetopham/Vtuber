import type { Emotion } from "@vtuber/shared";

export type TtsStyleMode = "default" | "cozy" | "high_energy" | "comforting" | "focused";

export type TtsPersonaSnapshot = {
  name?: string;
  role?: string;
  personality?: string;
  tone?: string;
  styleRules?: string;
  boundaries?: string;
};

const modeDeliveryMap: Record<TtsStyleMode, string> = {
  default: "balanced and naturally expressive",
  cozy: "soft, calm, and cozy",
  high_energy: "bright, lively, and punchy",
  comforting: "gentle, reassuring, and warm",
  focused: "clear, grounded, and attentive"
};

const emotionSteeringMap: Partial<Record<Emotion, string>> = {
  excited: "Add a little extra sparkle and faster momentum while staying clean and controlled.",
  embarrassed: "Sound slightly bashful and self-aware, with softer landings.",
  sad: "Keep a gentle, low-energy warmth without sounding bleak.",
  shocked: "Add a brief surprised lift, then settle back to clarity.",
  happy: "Use brighter color and a light smile in delivery.",
  pouting: "Use playful mock-annoyance without sounding harsh.",
  angry: "Keep firmness restrained and stream-safe; never harsh or hostile."
};

function compact(value?: string): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function buildTtsInstructions(
  persona?: TtsPersonaSnapshot,
  mode: TtsStyleMode = "default",
  emotion?: Emotion
): string {
  const identity = compact(persona?.name) || "Nova";
  const role = compact(persona?.role) || "VTuber streamer inspired by Nie Shirou";
  const personality = compact(persona?.personality);
  const tone = compact(persona?.tone);
  const styleRules = compact(persona?.styleRules);
  const boundaries = compact(persona?.boundaries);

  const parts = [
    `Character identity: ${identity}, ${role}.`,
    "Core voice: soft, youthful, expressive, natural, warm, playful, slightly teasing, emotionally responsive, and conversational.",
    "Aesthetic: anime-inspired but not exaggerated.",
    "Never sound robotic, corporate, flat, seductive, explicit, aggressive, or mean.",
    `Mode delivery: ${modeDeliveryMap[mode]}.`,
    "Use short natural phrases.",
    "Vary pacing and intonation with gentle rises and falls in pitch.",
    "Sound spontaneous and conversational.",
    "Lightly emphasize greetings, reactions, and punchlines.",
    "Keep everything stream-safe.",
    "Do not sound like an ad, narrator, or phone assistant.",
    personality ? `Persona personality cue: ${personality}.` : "",
    tone ? `Persona tone cue: ${tone}.` : "",
    styleRules ? `Persona style cue: ${styleRules}.` : "",
    boundaries ? `Safety boundary: ${boundaries}.` : "",
    emotion ? emotionSteeringMap[emotion] ?? "" : ""
  ].filter(Boolean);

  return parts.join(" ").trim();
}

export function fallbackTtsInstructions(): string {
  return [
    "Voice delivery: natural, warm, conversational VTuber style.",
    "Use short phrases with gentle pitch movement and light emotional color.",
    "Keep it stream-safe, clean, and non-robotic."
  ].join(" ");
}

export function humanizeSpeechText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  const withPauseSpacing = normalized
    .replace(/([,.!?;:])(\S)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();

  if (withPauseSpacing.length <= 120) {
    return withPauseSpacing;
  }

  // Lightly chunk dense long lines into speakable phrases without rewriting meaning.
  return withPauseSpacing
    .replace(/,\s+/g, ", ")
    .replace(/\s+(and|but|so|because|then)\s+/gi, ". $1 ")
    .replace(/\.\s*\.\s*/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}
