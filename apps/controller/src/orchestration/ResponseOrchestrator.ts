import { ZodError } from "zod";
import {
  performanceIntentSchema,
  type PerformanceIntent,
  type RespondRequest
} from "@vtuber/shared";
import { OpenAIResponsesService } from "../services/OpenAIResponsesService";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";
import { normalizeIntent } from "./schema";

export type OrchestratorStatus = {
  hasOpenAIApiKey: boolean;
  model: string;
  lastIntent: PerformanceIntent | null;
  lastValidationError: string | null;
  lastRespondTriggeredSpeaking: boolean;
};

export class ResponseOrchestrator {
  private lastIntent: PerformanceIntent | null = null;
  private lastValidationError: string | null = null;
  private lastRespondTriggeredSpeaking = false;

  constructor(
    private readonly dependencies: {
      service: OpenAIResponsesService;
      hasOpenAIApiKey: boolean;
      model: string;
    }
  ) {}

  async generateIntent(input: RespondRequest): Promise<PerformanceIntent> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(input);

    const result = await this.dependencies.service.requestStructuredIntent(systemPrompt, userPrompt);

    try {
      const intent = normalizeIntent(performanceIntentSchema.parse(result.parsedOutput));
      this.lastIntent = intent;
      this.lastValidationError = null;
      return intent;
    } catch (error) {
      this.lastValidationError = (error as Error).message;

      console.error("[orchestrator] intent validation failed", {
        input,
        rawOutput: result.rawOutputText,
        error: error instanceof ZodError ? error.issues : this.lastValidationError
      });

      throw new Error("Failed to generate valid performance intent");
    }
  }

  markRespondOutcome(triggeredSpeaking: boolean): void {
    this.lastRespondTriggeredSpeaking = triggeredSpeaking;
  }

  setLastValidationError(message: string): void {
    this.lastValidationError = message;
  }

  getStatus(): OrchestratorStatus {
    return {
      hasOpenAIApiKey: this.dependencies.hasOpenAIApiKey,
      model: this.dependencies.model,
      lastIntent: this.lastIntent,
      lastValidationError: this.lastValidationError,
      lastRespondTriggeredSpeaking: this.lastRespondTriggeredSpeaking
    };
  }
}
