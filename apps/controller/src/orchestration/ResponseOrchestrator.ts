import { ZodError } from "zod";
import {
  performanceIntentSchema,
  type PerformanceIntent,
  type RespondRequest
} from "@vtuber/shared";
import { OpenAIResponsesService } from "../services/OpenAIResponsesService";
import {
  buildSystemPrompt,
  buildUserPrompt,
  defaultPersonaConfig,
  type PersonaConfig
} from "./prompt";
import { normalizeIntent } from "./schema";

export type OrchestratorStatus = {
  hasOpenAIApiKey: boolean;
  model: string;
  lastIntent: PerformanceIntent | null;
  lastValidationError: string | null;
  lastRespondTriggeredSpeaking: boolean;
  persona: PersonaConfig;
};

export class ResponseOrchestrator {
  private lastIntent: PerformanceIntent | null = null;
  private lastValidationError: string | null = null;
  private lastRespondTriggeredSpeaking = false;
  private personaConfig: PersonaConfig = { ...defaultPersonaConfig };

  constructor(
    private readonly dependencies: {
      service: OpenAIResponsesService;
      hasOpenAIApiKey: boolean;
      model: string;
    }
  ) {}

  async generateIntent(input: RespondRequest): Promise<PerformanceIntent> {
    const systemPrompt = buildSystemPrompt(this.personaConfig);
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

  setPersonaConfig(personaConfig: PersonaConfig): void {
    this.personaConfig = { ...personaConfig };
  }

  getPersonaConfig(): PersonaConfig {
    return { ...this.personaConfig };
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
      lastRespondTriggeredSpeaking: this.lastRespondTriggeredSpeaking,
      persona: this.getPersonaConfig()
    };
  }
}
