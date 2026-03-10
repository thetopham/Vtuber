import type { Emotion } from "@vtuber/shared";
import type { TtsPersonaSnapshot, TtsStyleMode } from "../speech/ttsInstructions";

export type SynthesizeSpeechInput = {
  text: string;
  emotion?: Emotion;
  persona?: TtsPersonaSnapshot;
  styleMode?: TtsStyleMode;
};

export type SynthesizeSpeechResult = {
  audioBuffer: Buffer;
  extension: "wav" | "mp3";
};

export interface SpeechProvider {
  synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
}
