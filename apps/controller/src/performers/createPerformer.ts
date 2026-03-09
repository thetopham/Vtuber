import type { EventName, EventPayloadMap } from "@vtuber/shared";
import { VTubeStudioAdapter } from "../adapters/VTubeStudioAdapter";
import type { PerformerConfig } from "../config/performers";
import { ResponseOrchestrator } from "../orchestration/ResponseOrchestrator";
import { OpenAIResponsesService } from "../services/OpenAIResponsesService";
import { ExpressionEngine } from "../services/ExpressionEngine";
import { OpenAISpeechProvider } from "../services/OpenAISpeechProvider";
import { AudioPlaybackService } from "../services/AudioPlaybackService";
import { PerformanceLoop } from "../services/PerformanceLoop";
import { VTubeStudioClient } from "../services/vtubeStudio";
import { env } from "../env";
import type { Performer } from "./types";

type PublishFn = <T extends EventName>(type: T, payload: EventPayloadMap[T]) => void;

export function createPerformer(args: {
  config: PerformerConfig;
  publish: PublishFn;
  getControllerStatus: () => string;
  sharedAudioPlaybackService: AudioPlaybackService;
  sharedSpeechProvider: OpenAISpeechProvider;
  responsesService: OpenAIResponsesService;
}): Performer {
  const { config } = args;

  const client = new VTubeStudioClient({
    url: config.vtsUrl,
    pluginName: env.vtsPluginName,
    pluginDeveloper: env.vtsPluginDeveloper,
    authToken: config.vtsAuthToken
  });

  const avatarAdapter = new VTubeStudioAdapter({
    client,
    hotkeys: config.hotkeys
  });

  const expressionEngine = new ExpressionEngine(avatarAdapter);

  const performanceLoop = new PerformanceLoop({
    performerId: config.id,
    expressionEngine,
    speechProvider: args.sharedSpeechProvider,
    audioPlaybackService: args.sharedAudioPlaybackService,
    publish: args.publish,
    getControllerStatus: args.getControllerStatus
  });

  const responseOrchestrator = new ResponseOrchestrator({
    service: args.responsesService,
    hasOpenAIApiKey: Boolean(env.openaiApiKey),
    model: env.openaiModel
  });

  responseOrchestrator.setPersonaConfig(config.persona);

  return {
    id: config.id,
    displayName: config.displayName,
    responseOrchestrator,
    performanceLoop,
    expressionEngine,
    avatarAdapter,
    client,
    getStatus: () => ({
      id: config.id,
      displayName: config.displayName,
      speech: performanceLoop.getStatus(),
      orchestrator: responseOrchestrator.getStatus(),
      avatar: avatarAdapter.getStatus()
    })
  };
}
