import type { SpeechProvider, SynthesizeSpeechInput, SynthesizeSpeechOutput } from "./SpeechProvider";

type OpenAISpeechProviderOptions = {
  apiKey: string;
  model: string;
  voice: string;
};

export class OpenAISpeechProvider implements SpeechProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly voice: string;

  public constructor(options: OpenAISpeechProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.voice = options.voice;
  }

  public async synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechOutput> {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        voice: this.voice,
        input: input.text,
        format: "wav"
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS failed: ${response.status} ${await response.text()}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    return {
      audioBuffer: Buffer.from(arrayBuffer),
      mimeType: "audio/wav",
      extension: "wav"
    };
  }
}
