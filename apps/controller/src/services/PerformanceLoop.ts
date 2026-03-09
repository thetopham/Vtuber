import type { Emotion, EventName, EventPayloadMap, SpeechRequest, SpeechStatus } from "@vtuber/shared";
import type { ExpressionEngine } from "./ExpressionEngine";
import type { AudioPlaybackService } from "./AudioPlaybackService";
import type { SpeechProvider } from "./SpeechProvider";

type EventPublisher = <T extends EventName>(type: T, payload: EventPayloadMap[T]) => void;

type PerformanceLoopOptions = {
  expressionEngine: ExpressionEngine;
  speechProvider: SpeechProvider;
  audioPlaybackService: AudioPlaybackService;
  publish: EventPublisher;
};

export class PerformanceLoop {
  private readonly expressionEngine: ExpressionEngine;
  private readonly speechProvider: SpeechProvider;
  private readonly audioPlaybackService: AudioPlaybackService;
  private readonly publish: EventPublisher;
  private lastSpokenText: string | null = null;
  private lastRequestedEmotion: Emotion | null = null;

  public constructor(options: PerformanceLoopOptions) {
    this.expressionEngine = options.expressionEngine;
    this.speechProvider = options.speechProvider;
    this.audioPlaybackService = options.audioPlaybackService;
    this.publish = options.publish;
  }

  public async performSpeech(request: SpeechRequest): Promise<void> {
    const normalized = this.expressionEngine.normalizeEmotionInput(request.emotion);
    const expressionState = this.expressionEngine.buildExpressionState(normalized);
    await this.expressionEngine.applyExpressionState(expressionState);

    this.lastRequestedEmotion = normalized;
    this.lastSpokenText = request.text;

    this.publish("emotion.set", { emotion: normalized });
    this.publish("subtitle.set", { text: request.text });
    this.publish("speaking.set", { speaking: true });
    this.publish("state.set", { state: "speaking" });
    this.publish("speech.started", { text: request.text, emotion: normalized });

    try {
      const synthesized = await this.speechProvider.synthesize({ text: request.text });
      await this.audioPlaybackService.playWavBuffer(synthesized.audioBuffer);
    } finally {
      this.publish("speaking.set", { speaking: false });
      this.publish("state.set", { state: "idle" });
      this.publish("speech.finished", { text: request.text, emotion: normalized });
    }
  }

  public getSpeechStatus(currentControllerState: "idle" | "listening" | "speaking"): SpeechStatus {
    const playbackStatus = this.audioPlaybackService.getStatus();

    return {
      isPlaying: playbackStatus.isPlaying,
      lastSpokenText: this.lastSpokenText,
      lastRequestedEmotion: this.lastRequestedEmotion,
      currentControllerState,
      lastAudioFilePath: playbackStatus.lastAudioFilePath
    };
  }
}
