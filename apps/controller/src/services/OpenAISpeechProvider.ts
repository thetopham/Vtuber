import { env } from "../env";
import type { SpeechProvider, SynthesizeSpeechInput, SynthesizeSpeechResult } from "./SpeechProvider";

export class OpenAISpeechProvider implements SpeechProvider {
  async synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult> {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for TTS synthesis");
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.openaiTtsModel,
        voice: env.openaiTtsVoice,
        input: input.text,
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
