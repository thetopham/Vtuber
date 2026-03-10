import { env } from "../env";
import { performanceIntentJsonSchema } from "../orchestration/schema";

type ResponsesApiContent = {
  type?: string;
  text?: string;
};

type ResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: ResponsesApiContent[];
  }>;
};

export type StructuredResponseResult = {
  parsedOutput: unknown;
  rawOutputText: string;
  parseError: string | null;
};

export class OpenAIResponsesService {
  async requestStructuredIntent(systemPrompt: string, userPrompt: string): Promise<StructuredResponseResult> {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for orchestration");
    }

    const requestId = `vtuber-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": requestId
      },
      body: JSON.stringify({
        model: env.openaiModel,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: systemPrompt }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: userPrompt }]
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "performance_intent",
            strict: true,
            schema: performanceIntentJsonSchema
          }
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI Responses request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as ResponsesApiResponse;
    const rawOutputText = this.extractText(payload);

    try {
      return {
        rawOutputText,
        parsedOutput: JSON.parse(rawOutputText) as unknown,
        parseError: null
      };
    } catch (error) {
      return {
        rawOutputText,
        parsedOutput: rawOutputText,
        parseError: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private extractText(payload: ResponsesApiResponse): string {
    if (payload.output_text) {
      return payload.output_text;
    }

    const outputText = payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text" && typeof content.text === "string")
      .map((content) => content.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n")
      .trim();

    if (outputText) {
      return outputText;
    }

    throw new Error("OpenAI Responses output_text not found");
  }
}
