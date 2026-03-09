import test from "node:test";
import assert from "node:assert/strict";
import type { MultiOverlayState, PerformanceIntent, RespondRequest } from "@vtuber/shared";
import { ConversationDirector } from "../director/ConversationDirector";
import type { Performer } from "../performers/types";

function createMockPerformer(id: string, spoken: string[], shouldSpeak = true): Performer {
  return {
    id,
    displayName: id,
    responseOrchestrator: {
      generateIntent: async (_input: RespondRequest): Promise<PerformanceIntent> => ({
        shouldSpeak,
        spokenText: `${id}-${spoken.length + 1}`,
        emotion: "happy"
      })
    } as unknown as Performer["responseOrchestrator"],
    performanceLoop: {
      performLine: async ({ text }: { text: string }) => {
        spoken.push(text);
      },
      getStatus: () => ({ isPlaying: false, lastSpokenText: null, lastRequestedEmotion: null, controllerState: "idle", lastAudioFilePath: null })
    } as unknown as Performer["performanceLoop"],
    expressionEngine: {} as Performer["expressionEngine"],
    avatarAdapter: { getStatus: () => ({}) } as unknown as Performer["avatarAdapter"],
    client: {} as unknown as Performer["client"],
    getStatus: () => ({ id, displayName: id, speech: {} as never, orchestrator: {} as never, avatar: {} as never })
  };
}

test("director alternates speakers in autonomous banter", async () => {
  const spoken: string[] = [];
  let state: MultiOverlayState = {
    stage: { mode: "idle", activeSpeakerId: null, banterEnabled: false, banterStatus: "idle", lastSpeakerId: null },
    performers: {},
    legacy: { characterName: "Nova", subtitle: "", speaking: false, emotion: "neutral", status: "idle", scene: "default", state: "idle" }
  };

  const director = new ConversationDirector(
    [createMockPerformer("nova", spoken), createMockPerformer("echo", spoken)],
    {
      updateStage: (updater) => {
        state = { ...state, stage: updater(state.stage) };
      },
      getState: () => state
    }
  );

  await director.startAutonomousBanter("start");
  await new Promise((r) => setTimeout(r, 350));
  await director.stopAutonomousBanter();

  assert.ok(spoken.length >= 2);
});

test("director interruption routes to opposite speaker", async () => {
  const spoken: string[] = [];
  let state: MultiOverlayState = {
    stage: { mode: "banter", activeSpeakerId: null, banterEnabled: true, banterStatus: "running", lastSpeakerId: "nova" },
    performers: {},
    legacy: { characterName: "Nova", subtitle: "", speaking: false, emotion: "neutral", status: "idle", scene: "default", state: "idle" }
  };

  const director = new ConversationDirector(
    [createMockPerformer("nova", spoken), createMockPerformer("echo", spoken)],
    {
      updateStage: (updater) => {
        state = { ...state, stage: updater(state.stage) };
      },
      getState: () => state
    }
  );

  const result = await director.interruptWithChat({ inputType: "event", event: { type: "chat.message", summary: "hi" } });
  assert.equal(result.performerId, "echo");
});
