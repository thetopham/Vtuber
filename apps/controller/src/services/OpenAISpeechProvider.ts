import { env } from "../env";
import {
  buildTtsInstructions,
  fallbackTtsInstructions,
  type TtsStyleMode,
  humanizeSpeechText
} from "../speech/ttsInstructions";
import type { SpeechProvider, SynthesizeSpeechInput, SynthesizeSpeechResult } from "./SpeechProvider";

const supportedStyleModes: ReadonlyArray<TtsStyleMode> = ["default", "cozy", "high_energy", "comforting", "focused"];

function resolveStyleMode(mode?: string): TtsStyleMode {
  if (mode && supportedStyleModes.includes(mode as TtsStyleMode)) {
    return mode as TtsStyleMode;
  }

  return "default";
}

function resolveSpeed(speed: number): number {
  if (!Number.isFinite(speed)) {
    return 0.94;
  }

  return Math.min(1.4, Math.max(0.25, speed));
}

export class OpenAISpeechProvider implements SpeechProvider {
  async synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for TTS synthesis");
    }

    const cleanedText = humanizeSpeechText(input.text);
    const styleMode = resolveStyleMode(input.styleMode ?? env.openaiTtsStyleMode);
    const builtInstructions = buildTtsInstructions(input.persona, styleMode, input.emotion);
    const instructions = builtInstructions.length > 0 ? builtInstructions : fallbackTtsInstructions();

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.openaiTtsModel,
        voice: env.openaiTtsVoice,
        input: cleanedText,
        instructions,
        speed: resolveSpeed(env.openaiTtsSpeed),
        response_format: "wav"
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI TTS request failed (${response.status}): ${errorBody}`);
    }

    const data = await response.arrayBuffer();
    return {
      audioBuffer: Buffer.from(data),
      extension: "wav"
    };
  }
}
