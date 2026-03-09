export type SynthesizeSpeechInput = {
  text: string;
};

export type SynthesizeSpeechResult = {
  audioBuffer: Buffer;
  extension: "wav" | "mp3";
};

export interface SpeechProvider {
  synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
}
