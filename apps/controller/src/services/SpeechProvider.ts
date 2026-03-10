import type { Emotion } from "@vtuber/shared";
import type { TtsPersonaInput, TtsStyleMode } from "../speech/ttsInstructions";

export type SynthesizeSpeechInput = {
  text: string;
  emotion?: Emotion;
  persona?: TtsPersonaInput;
  styleMode?: TtsStyleMode;
};

export type SynthesizeSpeechResult = {
  audioBuffer: Buffer;
  extension: "wav" | "mp3";
};

export interface SpeechProvider {
  synthesize(input: SynthesizeSpeechInput): Promise<SynthesizeSpeechResult>;
}
