import type { AvatarExpressionState, Emotion, EventName, EventPayloadMap, SpeechStatus } from "@vtuber/shared";
import { ExpressionEngine } from "./ExpressionEngine";
import type { AudioPlaybackService } from "./AudioPlaybackService";
import type { SpeechProvider } from "./SpeechProvider";

type PublishFn = <T extends EventName>(type: T, payload: EventPayloadMap[T]) => void;

type PerformanceLoopDependencies = {
  expressionEngine: ExpressionEngine;
  speechProvider: SpeechProvider;
  audioPlaybackService: AudioPlaybackService;
  publish: PublishFn;
  getControllerStatus: () => string;
};

export type SpeakInput = {
  text: string;
  emotion: Emotion;
  expressionState?: AvatarExpressionState;
};

export class PerformanceLoop {
  private lastSpokenText: string | null = null;
  private lastRequestedEmotion: Emotion | null = null;
  private activeRun: Promise<void> | null = null;

  constructor(private readonly dependencies: PerformanceLoopDependencies) {}

  async performLine(input: SpeakInput): Promise<void> {
    if (this.activeRun) {
      throw new Error("Speech playback already in progress");
    }

    this.lastSpokenText = input.text;
    this.lastRequestedEmotion = input.emotion;

    this.activeRun = this.runSpeech(input);

    try {
      await this.activeRun;
    } finally {
      this.activeRun = null;
    }
  }

  getStatus(): SpeechStatus {
    const playbackStatus = this.dependencies.audioPlaybackService.getStatus();

    return {
      isPlaying: playbackStatus.isPlaying,
      lastSpokenText: this.lastSpokenText,
      lastRequestedEmotion: this.lastRequestedEmotion,
      controllerState: this.dependencies.getControllerStatus(),
      lastAudioFilePath: playbackStatus.lastAudioFilePath
    };
  }

  private async runSpeech(input: SpeakInput): Promise<void> {
    const { expressionEngine, speechProvider, audioPlaybackService, publish } = this.dependencies;

    const expressionState = input.expressionState ?? expressionEngine.buildExpressionState(input.emotion);
    await expressionEngine.applyExpressionState(expressionState);

    publish("emotion.set", { emotion: input.emotion });
    publish("subtitle.set", { text: input.text });
    publish("state.set", { state: "speaking" });
    publish("speaking.set", { speaking: true });
    publish("speech.started", { text: input.text, emotion: input.emotion });

    try {
      const speechResult = await speechProvider.synthesize({ text: input.text });
      await audioPlaybackService.playBuffer(speechResult.audioBuffer, speechResult.extension);
    } finally {
      publish("speaking.set", { speaking: false });
      publish("state.set", { state: "idle" });
      publish("speech.finished", { text: input.text, emotion: input.emotion });
    }
  }
}
