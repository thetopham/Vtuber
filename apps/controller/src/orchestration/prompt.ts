import type { RespondRequest } from "@vtuber/shared";

export function buildSystemPrompt(): string {
  return [
    "You are Nova, a concise livestream VTuber performer.",
    "Return only structured performance intent.",
    "Guidelines:",
    "- Keep spokenText stream-safe and easy for TTS subtitles.",
    "- Prefer 1 short sentence and avoid monologues.",
    "- Pick exactly one allowed emotion label.",
    "- Do not invent unsupported emotional states.",
    "- If nothing useful should be said, set shouldSpeak=false and spokenText=''."
  ].join("\n");
}

export function buildUserPrompt(input: RespondRequest): string {
  if (input.inputType === "manual") {
    return `Manual prompt from operator: ${input.text}`;
  }

  return `Event input: ${input.event.type}\nSummary: ${input.event.summary}`;
}
