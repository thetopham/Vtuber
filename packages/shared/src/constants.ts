export const EMOTIONS = [
  'neutral',
  'happy',
  'angry',
  'sad',
  'surprised',
  'thinking',
] as const;

export type Emotion = (typeof EMOTIONS)[number];

export const DEFAULT_CHARACTER_NAME = 'AI VTuber';

export const DEFAULT_OVERLAY_STATE = {
  subtitle: 'System online. Waiting for input...',
  speaking: false,
  emotion: 'neutral' as Emotion,
  status: 'idle',
  scene: 'default',
  characterName: DEFAULT_CHARACTER_NAME,
};
