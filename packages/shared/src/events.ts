import type {
  EmotionPayload,
  OverlayState,
  ScenePayload,
  SpeakingPayload,
  StatusPayload,
  SubtitlePayload,
} from './schemas.js';

export type ControllerEventMap = {
  'subtitle.set': SubtitlePayload;
  'speaking.set': SpeakingPayload;
  'emotion.set': EmotionPayload;
  'status.set': StatusPayload;
  'scene.set': ScenePayload;
  'state.snapshot': OverlayState;
};

export type ControllerEventType = keyof ControllerEventMap;
