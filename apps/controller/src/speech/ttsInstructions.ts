export type TtsStyleMode = "default" | "cozy" | "high_energy" | "comforting" | "focused";

export type TtsPersonaInput = {
  name?: string;
  role?: string;
  personality?: string;
  tone?: string;
  styleRules?: string;
};

const MODE_GUIDANCE: Record<TtsStyleMode, string> = {
  default:
    "Keep delivery balanced: soft, youthful, warm, playful, emotionally responsive, and conversational.",
  cozy:
    "Lean gentler and cozier: relaxed pacing, softer edges, reassuring warmth, and intimate stream-chat energy.",
  high_energy:
    "Lean upbeat and lively: brighter pace, punchier reactions, and a little more momentum while staying natural.",
  comforting:
    "Lean soothing and supportive: slower cadence, calm steadiness, and emotionally grounding delivery.",
  focused:
    "Lean clear and focused: crisp diction, controlled pacing, and concise emphasis without sounding robotic."
};

const EMOTION_GUIDANCE: Partial<Record<string, string>> = {
  excited: "Sound brighter with quicker reactions and energetic emphasis.",
  embarrassed: "Add slight bashful hesitation and softer phrasing without losing clarity.",
  sad: "Use gentler pacing and warmer, quieter emotional weight.",
  shocked: "Add a brief startled lift and sharper contrast on reaction words."
};

export function buildTtsInstructions(
  persona: TtsPersonaInput,
  mode: TtsStyleMode = "default",
  emotion?: string
): string {
  const identity = [persona.name, persona.role].filter(Boolean).join(" - ") || "Nova, a Nie Shirou-inspired VTuber";
  const optionalPersonaHints = [persona.personality, persona.tone, persona.styleRules]
    .filter((value) => typeof value === "string" && value.trim().length > 0)
    .map((value) => value?.trim())
    .slice(0, 3)
    .join(" ");

  const sections = [
    `Character identity: ${identity}.`,
    "Tone and emotional style: soft, youthful, expressive, natural, warm, playful, slightly teasing, emotionally responsive, conversational, anime-inspired but not exaggerated.",
    "Delivery and cadence: use short natural phrases, vary pacing and intonation, use gentle rises and falls in pitch, and sound spontaneous and conversational.",
    "Pronunciation and emphasis: clear and natural pronunciation; lightly emphasize greetings, reactions, and punchlines.",
    "VTuber style cues: friendly live-stream banter energy, reactive timing, and audience-aware delivery.",
    "Boundaries: keep everything stream-safe; avoid seductive, explicit, aggressive, or mean delivery; do not sound like an ad, narrator, phone assistant, corporate training voice, or flat robotic TTS.",
    MODE_GUIDANCE[mode],
    emotion ? EMOTION_GUIDANCE[emotion] ?? "Keep emotional nuance subtle and believable." : ""
  ];

  if (optionalPersonaHints) {
    sections.splice(1, 0, `Persona hints: ${optionalPersonaHints}.`);
  }

  return sections
    .filter((line) => line.trim().length > 0)
    .join(" ")
    .trim();
}
