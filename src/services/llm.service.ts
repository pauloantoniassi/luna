import OpenAI from "openai";
import {
  ChatModel,
  ResponseFormatJSONSchema,
  ChatCompletionMessageParam,
  CompletionUsage, ChatCompletion
} from "openai/resources";
import {Chat} from "../entities/Chat";
import {getPrompt} from "../prompts/getPrompt";
import { SUMMARY_PROMPT } from "../prompts/SUMMARY_PROMPT";
import PERSONALITY_PROMPT from "../constants/PERSONALITY_PROMPT";
import {AISummaryType, AISummaryZod} from "../models/ai-summary.dto";
import {z} from "zod";
import {CostService} from "./cost.service";

export enum AI_MODELS {
  DEFAULT = "DEFAULT",
  WEAK = "WEAK",
}

export type LlmUsageResponseWithOpenRouterFields = CompletionUsage & { cost?: number };
export type LlmResponseType<ResponseType> = { response: ResponseType | null, usage?: LlmUsageResponseWithOpenRouterFields }
type OpenAPIResponseWithOpenRouterFields = ChatCompletion & { usage?: LlmUsageResponseWithOpenRouterFields };

export class LlmService {
  private static openai: OpenAI;
  private costService: CostService;

  constructor() {
    if (!LlmService.openai) {
      LlmService.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        baseURL: process.env.OPENAI_API_BASE_URL,
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/pauloantoniassi/luna',
          'X-Title': 'Luna',
        }
      });
    }
    this.costService = new CostService();
  }

  static getInstance() {
   return new LlmService();
  }

  async callText<ResponseType extends object>(
    messages: Array<ChatCompletionMessageParam>,
    responseSchema: ResponseFormatJSONSchema.JSONSchema,
    model: AI_MODELS | ChatModel = AI_MODELS.DEFAULT,
    includePersona = true,
    safety_identifier?: string
  ): Promise<LlmResponseType<ResponseType>> {
    const response: OpenAPIResponseWithOpenRouterFields = await LlmService.openai.chat.completions.create({
      model,
      messages: [
        ...(includePersona ? [{
          role: "system" as const,
          content: getPrompt(PERSONALITY_PROMPT)
        }] : []),
        ...messages
      ],
      response_format: {
        type: "json_schema",
        json_schema: responseSchema
      },
      max_completion_tokens: 10240,
      max_tokens: 10240,
      temperature: 0.7,
      n: 1,
      safety_identifier,
      user: safety_identifier,
      // @ts-expect-error This is a workaround for the OpenAI SDK type issue. Usage is only available for OpenRouter
      usage: {
        include: true
      }
    });

    return {
      response: response.choices[0]?.message?.content ? JSON.parse(response.choices[0]?.message?.content) : null,
      usage: response.usage
    }
  }

  public async generateChatHistorySummary(
    chat: Chat,
    newMessages: { author: { name?: string | null, id: number }, body: string, timestamp: string }[],
    previousSummary?: { summary: string, timestamp: string }
  ): Promise<AISummaryType> {
    const prompt = getPrompt(SUMMARY_PROMPT, {
      chatName: chat.name || "Unnamed Chat",
      previousSummary: previousSummary
        ? `Previous summary (until ${previousSummary.timestamp}): ${previousSummary.summary}`
        : "No previous summary available.",
      newMessages: newMessages.map(msg =>
        `[${msg.timestamp}] (Sender ID: ${msg.author.id}/${msg.author.name || "Unknown"}): ${JSON.stringify(msg.body.trim())}`
      ).join("\n")
    });

    const llmResult = await this.callText<AISummaryType>(
      [{ role: "user" as const, content: prompt }],
      {
        name: "summary_response",
        schema: z.toJSONSchema(AISummaryZod)
      },
      AI_MODELS.DEFAULT
    );

    if (!llmResult.response || !AISummaryZod.safeParse(llmResult.response).success) {
      throw new Error("Failed to generate summary from LLM response.");
    }

    await this.costService.recordLlmChatUsage(chat, "summary", llmResult.usage);

    return llmResult.response
  }
}
