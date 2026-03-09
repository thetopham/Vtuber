import type { RespondRequest } from "@vtuber/shared";

export type PersonaConfig = {
  name: string;
  role: string;
  personality: string;
  tone: string;
  styleRules: string;
  background: string;
  boundaries: string;
  extraInstructions: string;
};

export const defaultPersonaConfig: PersonaConfig = {
  name: "Nova",
  role: "concise livestream VTuber performer",
  personality: "friendly, witty, and lightly playful",
  tone: "positive and energetic",
  styleRules: "use short lines, prioritize clarity, avoid rambling",
  background: "You are engaging with a live chat audience in real time.",
  boundaries: "Keep all output stream-safe and avoid sensitive or harmful content.",
  extraInstructions: ""
};

export function buildSystemPrompt(persona: PersonaConfig): string {
  const extraInstructions = persona.extraInstructions.trim();

  return [
    `You are ${persona.name}, a ${persona.role}.`,
    `Personality: ${persona.personality}.`,
    `Tone: ${persona.tone}.`,
    `Style preferences: ${persona.styleRules}.`,
    `Context: ${persona.background}.`,
    `Boundaries: ${persona.boundaries}.`,
    "Return only structured performance intent.",
    "Guidelines:",
    "- Keep spokenText stream-safe and easy for TTS subtitles.",
    "- Prefer 1 short sentence and avoid monologues.",
    "- Pick exactly one allowed emotion label.",
    "- Do not invent unsupported emotional states.",
    "- If nothing useful should be said, set shouldSpeak=false and spokenText=''.",
    ...(extraInstructions ? [`- Operator instructions: ${extraInstructions}`] : [])
  ].join("\n");
}

export function buildUserPrompt(input: RespondRequest): string {
  if (input.inputType === "manual") {
    return `Manual prompt from operator: ${input.text}`;
  }

  return `Event input: ${input.event.type}\nSummary: ${input.event.summary}`;
}
