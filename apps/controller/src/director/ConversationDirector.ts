import type { MultiOverlayState, PerformanceIntent, RespondRequest } from "@vtuber/shared";
import type { Performer } from "../performers/types";
import type { DirectorInput } from "./types";
import { toRespondRequest } from "./types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class ConversationDirector {
  private readonly performers: Map<string, Performer>;
  private speakingLock: Promise<void> = Promise.resolve();
  private banterTask: Promise<void> | null = null;
  private banterEnabled = false;
  private interrupted = false;

  constructor(
    performers: Performer[],
    private readonly hooks: {
      updateStage: (updater: (state: MultiOverlayState["stage"]) => MultiOverlayState["stage"]) => void;
      getState: () => MultiOverlayState;
    }
  ) {
    this.performers = new Map(performers.map((performer) => [performer.id, performer]));
  }

  async startAutonomousBanter(seed?: string): Promise<void> {
    if (this.banterTask) {
      return;
    }

    console.info("[director] banter start", { seed });
    this.banterEnabled = true;
    this.interrupted = false;
    this.hooks.updateStage((stage) => ({ ...stage, mode: "banter", banterEnabled: true, banterStatus: "running" }));

    this.banterTask = this.runBanterLoop(seed)
      .catch((error) => {
        console.error("[director] banter fatal error", error);
        this.hooks.updateStage((stage) => ({ ...stage, mode: "idle", banterStatus: "idle" }));
      })
      .finally(() => {
        this.banterTask = null;
      });
  }

  async stopAutonomousBanter(reason = "manual stop"): Promise<void> {
    console.info("[director] banter stop", { reason });
    this.banterEnabled = false;
    this.interrupted = true;
    this.hooks.updateStage((stage) => ({ ...stage, mode: "idle", banterEnabled: false, banterStatus: "interrupted" }));
    if (this.banterTask) {
      await this.banterTask;
    }
  }

  async interruptWithChat(input: RespondRequest): Promise<{ performerId: string; intent: PerformanceIntent }> {
    return this.interruptWithInput("chat", input);
  }

  async interruptWithOperator(input: RespondRequest): Promise<{ performerId: string; intent: PerformanceIntent }> {
    return this.interruptWithInput("operator", input);
  }

  async respondAsPerformer(
    performerId: string,
    input: RespondRequest,
    replyTarget: "chat" | "operator" | "cohost" | "event" = "event"
  ): Promise<PerformanceIntent> {
    const performer = this.getPerformer(performerId);
    const other = this.pickOtherPerformer(performerId);

    const intent = await performer.responseOrchestrator.generateIntent(input, {
      otherPerformerName: other?.displayName,
      replyTarget
    });

    if (!intent.shouldSpeak) {
      console.info("[director] intent shouldSpeak=false; skipping speech", { performerId });
      return intent;
    }

    await this.withSpeakingLock(async () => {
      this.hooks.updateStage((stage) => ({ ...stage, mode: "responding", activeSpeakerId: performerId, lastSpeakerId: performerId }));
      await performer.performanceLoop.performLine({
        text: intent.spokenText,
        emotion: intent.emotion,
        expressionState: intent.expressionState
      });
      this.hooks.updateStage((stage) => ({ ...stage, activeSpeakerId: null, lastSpeakerId: performerId }));
    });

    return intent;
  }

  getStatus(): Record<string, unknown> {
    return {
      banterEnabled: this.banterEnabled,
      running: Boolean(this.banterTask),
      performers: Array.from(this.performers.keys()),
      stage: this.hooks.getState().stage
    };
  }

  private async runBanterLoop(seed?: string): Promise<void> {
    const ids = Array.from(this.performers.keys());
    if (ids.length < 2) {
      throw new Error("At least two performers are required for banter");
    }

    const previousSpeakerId = this.hooks.getState().stage.lastSpeakerId;
    let speakerId = previousSpeakerId ? this.pickOtherPerformer(previousSpeakerId)?.id ?? ids[0] : ids[0];
    let nextInput: DirectorInput = seed
      ? { kind: "operator", text: seed }
      : { kind: "event", eventType: "banter.seed", summary: "Start playful autonomous banter." };

    while (this.banterEnabled) {
      if (this.interrupted) {
        this.interrupted = false;
        this.hooks.updateStage((stage) => ({ ...stage, banterStatus: "running" }));
      }

      const performer = this.getPerformer(speakerId);
      const other = this.pickOtherPerformer(speakerId);
      if (!other) {
        return;
      }

      console.info("[director] banter turn", { speakerId, inputKind: nextInput.kind });

      const intent = await performer.responseOrchestrator.generateIntent(toRespondRequest(nextInput), {
        otherPerformerName: other.displayName,
        replyTarget: nextInput.kind === "performer_line" ? "cohost" : "event"
      });

      if (intent.shouldSpeak) {
        await this.withSpeakingLock(async () => {
          this.hooks.updateStage((stage) => ({ ...stage, mode: "banter", activeSpeakerId: speakerId, lastSpeakerId: speakerId }));
          await performer.performanceLoop.performLine({
            text: intent.spokenText,
            emotion: intent.emotion,
            expressionState: intent.expressionState
          });
          this.hooks.updateStage((stage) => ({ ...stage, activeSpeakerId: null, lastSpeakerId: speakerId }));
        });

        nextInput = { kind: "performer_line", fromPerformerId: speakerId, text: intent.spokenText };
      } else {
        // Policy: if shouldSpeak=false, swap speaker and feed a minimal handoff event.
        nextInput = { kind: "event", eventType: "banter.skip", summary: `${performer.displayName} passed the turn.` };
      }

      speakerId = other.id;
      await sleep(120);
    }

    this.hooks.updateStage((stage) => ({ ...stage, mode: "idle", banterStatus: "idle", activeSpeakerId: null }));
  }

  private async interruptWithInput(
    kind: "chat" | "operator",
    input: RespondRequest
  ): Promise<{ performerId: string; intent: PerformanceIntent }> {
    this.interrupted = true;
    this.hooks.updateStage((stage) => ({ ...stage, banterStatus: "interrupted", mode: "responding" }));

    const lastSpeakerId = this.hooks.getState().stage.lastSpeakerId;
    const targetId = lastSpeakerId
      ? this.pickOtherPerformer(lastSpeakerId)?.id
      : Array.from(this.performers.keys())[0];

    if (!targetId) {
      throw new Error("No performers registered");
    }

    const intent = await this.respondAsPerformer(targetId, input, kind);

    if (this.banterEnabled && !this.banterTask) {
      await this.startAutonomousBanter();
    }

    return { performerId: targetId, intent };
  }

  private getPerformer(performerId: string): Performer {
    const performer = this.performers.get(performerId);
    if (!performer) {
      throw new Error(`Unknown performer: ${performerId}`);
    }

    return performer;
  }

  private pickOtherPerformer(performerId: string): Performer | undefined {
    return Array.from(this.performers.values()).find((performer) => performer.id !== performerId);
  }

  private async withSpeakingLock(work: () => Promise<void>): Promise<void> {
    const run = this.speakingLock.then(work, work);
    this.speakingLock = run.catch(() => undefined);
    await run;
  }
}
