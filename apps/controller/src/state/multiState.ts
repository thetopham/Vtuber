import { defaultOverlayState, type MultiOverlayState, type OverlayState, type PerformerOverlayState } from "@vtuber/shared";

export function createPerformerOverlayState(performerId: string, characterName: string): PerformerOverlayState {
  return {
    performerId,
    ...defaultOverlayState,
    characterName,
    status: `${characterName} ready`
  };
}

export function createInitialMultiState(performers: Array<{ id: string; displayName: string }>): MultiOverlayState {
  const performerStateMap: MultiOverlayState["performers"] = {};

  for (const performer of performers) {
    performerStateMap[performer.id] = createPerformerOverlayState(performer.id, performer.displayName);
  }

  const first = performers[0];

  return {
    stage: {
      mode: "idle",
      activeSpeakerId: null,
      banterEnabled: false,
      banterStatus: "idle",
      lastSpeakerId: null
    },
    performers: performerStateMap,
    legacy: first ? buildLegacyState(performerStateMap[first.id]) : { ...defaultOverlayState }
  };
}

export function buildLegacyState(primary: PerformerOverlayState): OverlayState {
  return {
    characterName: primary.characterName,
    subtitle: primary.subtitle,
    speaking: primary.speaking,
    emotion: primary.emotion,
    status: primary.status,
    scene: primary.scene,
    state: primary.state
  };
}
