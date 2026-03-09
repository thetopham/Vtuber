export type SynthesizeSpeechInput = {
  text: string;
};

export type SynthesizeSpeechOutput = {
  audioBuffer: Buffer;
  mimeType: string;
  extension: "wav";
};

export interface SpeechProvider {
  synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechOutput>;
}
