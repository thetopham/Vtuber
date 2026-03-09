import type { AvatarToggle } from "@vtuber/shared";
import { env } from "../env";
import { defaultPersonaConfig, type PersonaConfig } from "../orchestration/prompt";

export type PerformerConfig = {
  id: string;
  displayName: string;
  vtsUrl: string;
  vtsAuthToken?: string;
  hotkeys: Record<AvatarToggle, string>;
  persona: PersonaConfig;
};

function readPerformerHotkeys(prefix: string): Record<AvatarToggle, string> {
  const existing = env.hotkeys;
  return {
    happy: process.env[`${prefix}_HOTKEY_HAPPY`] ?? existing.happy,
    neutral: process.env[`${prefix}_HOTKEY_NEUTRAL`] ?? existing.neutral,
    angry: process.env[`${prefix}_HOTKEY_ANGRY`] ?? existing.angry,
    approval: process.env[`${prefix}_HOTKEY_APPROVAL`] ?? existing.approval,
    excited: process.env[`${prefix}_HOTKEY_EXCITED`] ?? existing.excited,
    sad: process.env[`${prefix}_HOTKEY_SAD`] ?? existing.sad,
    shocked: process.env[`${prefix}_HOTKEY_SHOCKED`] ?? existing.shocked,
    embarrassed: process.env[`${prefix}_HOTKEY_EMBARRASSED`] ?? existing.embarrassed,
    wink: process.env[`${prefix}_HOTKEY_WINK`] ?? existing.wink
  };
}

export function getPerformerConfigs(): PerformerConfig[] {
  const novaPersona: PersonaConfig = {
    ...defaultPersonaConfig,
    name: "Nova",
    role: "chat-forward host VTuber",
    personality: "welcoming, sharp, and always chat-aware",
    styleRules: "keep responses concise, acknowledge chat often, move conversation forward"
  };

  const echoPersona: PersonaConfig = {
    ...defaultPersonaConfig,
    name: "Echo",
    role: "chaotic co-host VTuber",
    personality: "playful, punchy, and lightly mischievous",
    tone: "high-energy with friendly banter",
    styleRules: "keep lines short, react quickly, tease the co-host without being mean"
  };

  return [
    {
      id: "nova",
      displayName: "Nova",
      vtsUrl: process.env.VTS_NOVA_WS_URL ?? env.vtsUrl,
      vtsAuthToken: process.env.VTS_NOVA_AUTH_TOKEN ?? env.vtsAuthToken,
      hotkeys: readPerformerHotkeys("VTS_NOVA"),
      persona: novaPersona
    },
    {
      id: "echo",
      displayName: "Echo",
      vtsUrl: process.env.VTS_ECHO_WS_URL ?? env.vtsUrl,
      vtsAuthToken: process.env.VTS_ECHO_AUTH_TOKEN ?? env.vtsAuthToken,
      hotkeys: readPerformerHotkeys("VTS_ECHO"),
      persona: echoPersona
    }
  ];
}
