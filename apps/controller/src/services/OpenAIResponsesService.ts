import { env } from "../env";
import { performanceIntentJsonSchema } from "../orchestration/schema";

type ResponsesApiResponse = {
  output_text?: string;
  output?: Array<{
    type?: string;
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export type StructuredResponseResult = {
  parsedOutput: unknown;
  rawOutputText: string;
};

export class OpenAIResponsesService {
  async requestStructuredIntent(systemPrompt: string, userPrompt: string): Promise<StructuredResponseResult> {
    if (!env.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is required for orchestration");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openaiApiKey}`,
        "Content-Type": "application/json"
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

    return {
      rawOutputText,
      parsedOutput: JSON.parse(rawOutputText) as unknown
    };
  }

  private extractText(payload: ResponsesApiResponse): string {
    if (payload.output_text) {
      return payload.output_text;
    }

    const fromContent = payload.output
      ?.flatMap((item) => item.content ?? [])
      .find((content) => content.type === "output_text" && typeof content.text === "string")
      ?.text;

    if (fromContent) {
      return fromContent;
    }

    throw new Error("OpenAI Responses output_text not found");
  }
}
