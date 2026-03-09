import type { ResponseOrchestrator } from "../orchestration/ResponseOrchestrator";
import type { PerformanceLoop } from "../services/PerformanceLoop";
import type { ExpressionEngine } from "../services/ExpressionEngine";
import type { VTubeStudioAdapter } from "../adapters/VTubeStudioAdapter";
import type { VTubeStudioClient } from "../services/vtubeStudio";

export type PerformerStatus = {
  id: string;
  displayName: string;
  speech: ReturnType<PerformanceLoop["getStatus"]>;
  orchestrator: ReturnType<ResponseOrchestrator["getStatus"]>;
  avatar: ReturnType<VTubeStudioAdapter["getStatus"]>;
};

export type Performer = {
  id: string;
  displayName: string;
  responseOrchestrator: ResponseOrchestrator;
  performanceLoop: PerformanceLoop;
  expressionEngine: ExpressionEngine;
  avatarAdapter: VTubeStudioAdapter;
  client: VTubeStudioClient;
  getStatus(): PerformerStatus;
};
