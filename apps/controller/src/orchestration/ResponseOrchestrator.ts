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
  lastEmotion: PerformanceIntent["emotion"] | null;
  lastValidationError: string | null;
  lastValidationSucceeded: boolean;
  lastFallbackEmotionUsed: boolean;
  lastRespondTriggeredSpeaking: boolean;
  lastRawModelOutput: string | null;
  persona: PersonaConfig;
};

export class ResponseOrchestrator {
  private lastIntent: PerformanceIntent | null = null;
  private lastValidationError: string | null = null;
  private lastValidationSucceeded = false;
  private lastFallbackEmotionUsed = false;
  private lastRespondTriggeredSpeaking = false;
  private lastRawModelOutput: string | null = null;
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

    this.lastRawModelOutput = result.rawOutputText;

    if (result.parseError) {
      return this.useFallbackIntent(input, result.parsedOutput, `Model output was not valid JSON: ${result.parseError}`);
    }

    const parsedIntent = performanceIntentSchema.safeParse(result.parsedOutput);
    if (parsedIntent.success) {
      const intent = normalizeIntent(parsedIntent.data);
      this.lastIntent = intent;
      this.lastValidationError = null;
      this.lastValidationSucceeded = true;
      this.lastFallbackEmotionUsed = false;
      return intent;
    }

    return this.useFallbackIntent(input, result.parsedOutput, parsedIntent.error.message, parsedIntent.error.issues);
  }

  private useFallbackIntent(
    input: RespondRequest,
    rawOutput: unknown,
    validationMessage: string,
    issues?: unknown
  ): PerformanceIntent {
    const fallbackIntent = this.buildNeutralFallback(rawOutput);
    this.lastIntent = fallbackIntent;
    this.lastValidationError = validationMessage;
    this.lastValidationSucceeded = false;
    this.lastFallbackEmotionUsed = true;

    console.error("[orchestrator] intent validation failed; using neutral fallback", {
      input,
      rawOutput: this.lastRawModelOutput,
      error: issues ?? validationMessage
    });

    return fallbackIntent;
  }

  private buildNeutralFallback(rawOutput: unknown): PerformanceIntent {
    const shouldSpeak =
      typeof rawOutput === "object" &&
      rawOutput !== null &&
      "shouldSpeak" in rawOutput &&
      typeof (rawOutput as { shouldSpeak?: unknown }).shouldSpeak === "boolean"
        ? (rawOutput as { shouldSpeak: boolean }).shouldSpeak
        : false;

    const spokenText =
      typeof rawOutput === "object" &&
      rawOutput !== null &&
      "spokenText" in rawOutput &&
      typeof (rawOutput as { spokenText?: unknown }).spokenText === "string"
        ? (rawOutput as { spokenText: string }).spokenText.trim().slice(0, 240)
        : "";

    const normalizedText = shouldSpeak ? spokenText : "";

    return {
      shouldSpeak: shouldSpeak && normalizedText.length > 0,
      spokenText: shouldSpeak ? normalizedText : "",
      emotion: "neutral",
      notes: "Fallback intent used because model output failed validation"
    };
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
    this.lastValidationSucceeded = false;
  }

  getStatus(): OrchestratorStatus {
    return {
      hasOpenAIApiKey: this.dependencies.hasOpenAIApiKey,
      model: this.dependencies.model,
      lastIntent: this.lastIntent,
      lastEmotion: this.lastIntent?.emotion ?? null,
      lastValidationError: this.lastValidationError,
      lastValidationSucceeded: this.lastValidationSucceeded,
      lastFallbackEmotionUsed: this.lastFallbackEmotionUsed,
      lastRespondTriggeredSpeaking: this.lastRespondTriggeredSpeaking,
      lastRawModelOutput: this.lastRawModelOutput,
      persona: this.getPersonaConfig()
    };
  }
}
