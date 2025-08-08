import { ChatCompletionMessageParam } from "openai/resources";
import openai from "../services/openai";
import { Data } from "../utils/database";
import PERSONALITY_PROMPT from "../constants/PERSONALITY_PROMPT";
import { encoding_for_model } from "tiktoken";
import * as fs from "fs";
import path from "path";
import getHomeDir from "../utils/getHomeDir";
import beautifulLogger from "../utils/beautifulLogger";

export type Message = {
  content: string;
  name: string | undefined;
  ia: boolean;
  jid: string;
}[];

export type ResponseAction = {
  message?: {
    reply?: string;
    text: string;
  };
  sticker?: string;
  audio?: string;
  meme?: string;
  poll?: {
    question: string;
    options: [string, string, string];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
  contact?: {
    name?: string;
    cell: string;
  };
};

type ApiResponseAction = {
  type: "message" | "sticker" | "audio" | "poll" | "location" | "meme" | "contact";
  message?: {
    reply?: string;
    text: string;
  };
  sticker?: string;
  audio?: string;
  meme?: string;
  poll?: {
    question: string;
    options: [string, string, string];
  };
  contact?: {
    name?: string;
    cell: string;
  };
  location?: {
    latitude: number;
    longitude: number;
  };
};

export type BotResponse = ResponseAction[];

export type GenerateResponseResult = {
  actions: BotResponse;
  cost: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
};

const GPT4_1_PRICING = {
  input: 0.0004,
  output: 0.0016,
};

function calculateTokens(text: string): number {
  try {
    const encoder = encoding_for_model("gpt-4.1-mini");
    const tokens = encoder.encode(text);
    encoder.free();
    return tokens.length;
  } catch (error) {
    return Math.ceil(text.length / 4);
  }
}

const stickersDir = path.join(getHomeDir(), "stickers");
if (!fs.existsSync(stickersDir))
  throw new Error("Diretório de stickers não encontrado: " + stickersDir);
const stickerOptions: string[] = fs
  .readdirSync(stickersDir)
  .filter((file) => file.endsWith(".webp"));

const audiosDir = path.join(getHomeDir(), "audios");
if (!fs.existsSync(audiosDir)) throw new Error("Diretório de áudios não encontrado: " + audiosDir);
const audioOptions: string[] = fs.readdirSync(audiosDir).filter((file) => file.endsWith(".mp3"));

const memesDir = path.join(getHomeDir(), "memes");
if (!fs.existsSync(memesDir)) throw new Error("Diretório de memes não encontrado: " + memesDir);
const memeOptions: string[] = fs.readdirSync(memesDir).filter((file) => file.endsWith(".jpg"));

export default async function generateResponse(
  data: Data,
  messages: Message
): Promise<GenerateResponseResult> {
  beautifulLogger.aiGeneration("start", "Iniciando geração de resposta...");

  const uniqueMessages = messages.filter((message, index, array) => {
    return !array.some(
      (otherMessage, otherIndex) =>
        otherIndex > index &&
        otherMessage.content === message.content &&
        otherMessage.name === message.name
    );
  });

  const messagesMaped: string = uniqueMessages
    .map((message, i) => `${i + 1} - ${message.content}`)
    .join("\n");

  beautifulLogger.aiGeneration("processing", {
    "mensagens processadas": uniqueMessages.length,
    "mensagens originais": messages.length,
    "duplicatas removidas": messages.length - uniqueMessages.length,
    "mensagem mais recente": uniqueMessages[uniqueMessages.length - 1]?.content || "nenhuma",
  });

  const formatDataForPrompt = (data: Data): string => {
    let formattedData = "Resumo da conversa e opiniões dos usuários:\n\n";

    if (data.summary) {
      formattedData += `📋 RESUMO DA CONVERSA:\n${data.summary}\n\n`;
    }

    if (data.opinions && data.opinions.length > 0) {
      formattedData += `👥 OPINÕES SOBRE OS USUÁRIOS:\n`;
      data.opinions.forEach((opinion) => {
        formattedData += `• ${opinion.name} (${opinion.jid}):\n`;

        let opnion = "NEUTRO/MISTO";
        if (opinion.opinion < 20) opnion = "ODEIO ELE";
        else if (opinion.opinion < 40) opnion = "NÃO GOSTO";
        else if (opinion.opinion < 60) opnion = "NEUTRO/MISTO";
        else if (opinion.opinion < 80) opnion = "GOSTO BASTANTE";
        else if (opinion.opinion <= 100) opnion = "APAIXONADA";

        formattedData += `  - Nível de opinião: ${opinion.opinion}/100 (${opnion})\n`;
        if (opinion.traits && opinion.traits.length > 0) {
          formattedData += `  - O que acho dele (Características): ${opinion.traits.join(", ")}\n`;
        }
        formattedData += "\n";
      });
    }

    return formattedData.trim();
  };

  const contextData = formatDataForPrompt(data);

  const inputMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: PERSONALITY_PROMPT },
    { role: "assistant", content: contextData },
    {
      role: "user",
      content: `Conversa: \n\n${messagesMaped}`,
    },
  ];

  const inputText = inputMessages.map((msg) => msg.content).join("\n");
  const inputTokens = calculateTokens(inputText);

  beautifulLogger.aiGeneration("tokens", {
    "tokens de entrada": inputTokens,
    "tamanho da mensagem": inputText.length,
  });

  const responseSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "bot_response",
      strict: false,
      schema: {
        type: "object",
        properties: {
          actions: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["message", "sticker", "audio", "poll", "location", "meme", "contact"],
                  description: "Tipo da ação",
                },
                message: {
                  type: "object",
                  properties: {
                    reply: {
                      type: "string",
                      description: "ID da mensagem que está sendo respondida (opcional)",
                    },
                    text: {
                      type: "string",
                      description:
                        "Resposta com personalidade passivo-agressiva/irônica (máximo 300 caracteres)",
                    },
                  },
                  required: ["text"],
                  additionalProperties: false,
                },
                sticker: {
                  type: "string",
                  enum: stickerOptions,
                  description: "Nome do arquivo de sticker da lista disponível",
                },
                audio: {
                  type: "string",
                  enum: audioOptions,
                  description: "Nome do arquivo de áudio da lista disponível",
                },
                meme: {
                  type: "string",
                  enum: memeOptions,
                  description: "Nome do arquivo de meme da lista disponível",
                },
                poll: {
                  type: "object",
                  properties: {
                    question: {
                      type: "string",
                      description: "Pergunta irônica/engraçada para a enquete",
                    },
                    options: {
                      type: "array",
                      items: {
                        type: "string",
                      },
                      minItems: 3,
                      maxItems: 3,
                      description: "Exatamente 3 opções para a enquete",
                    },
                  },
                  required: ["question", "options"],
                  additionalProperties: false,
                },
                location: {
                  type: "object",
                  properties: {
                    latitude: {
                      type: "number",
                      description: "Latitude da localização",
                    },
                    longitude: {
                      type: "number",
                      description: "Longitude da localização",
                    },
                  },
                  required: ["latitude", "longitude"],
                  additionalProperties: false,
                },
              },
              required: ["type"],
              additionalProperties: false,
            },
          },
        },
        required: ["actions"],
        additionalProperties: false,
      },
    },
  };

  beautifulLogger.aiGeneration("processing", "Enviando requisição para OpenAI...");

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: inputMessages,
    response_format: responseSchema,
    temperature: 0.8,
    max_tokens: 100,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    beautifulLogger.aiGeneration("error", "Nenhuma resposta foi gerada pela IA");
    throw new Error("Nenhuma resposta foi gerada pela IA");
  }

  // Calcular tokens de saída
  const outputTokens = calculateTokens(content);
  const totalTokens = inputTokens + outputTokens;

  // Calcular custo
  const inputCostUSD = (inputTokens / 1000) * GPT4_1_PRICING.input;
  const outputCostUSD = (outputTokens / 1000) * GPT4_1_PRICING.output;
  const totalCostUSD = inputCostUSD + outputCostUSD;
  const cost = totalCostUSD;

  beautifulLogger.aiGeneration("cost", {
    "tokens entrada": inputTokens,
    "tokens saída": outputTokens,
    "tokens total": totalTokens,
    "custo (USD)": `$${cost.toFixed(6)}`,
  });

  try {
    const parsedResponse: { actions: ApiResponseAction[] } = JSON.parse(content);

    if (!Array.isArray(parsedResponse.actions)) {
      beautifulLogger.aiGeneration("error", "Resposta não contém array de ações válidas");
      return {
        actions: [],
        cost: {
          inputTokens,
          outputTokens,
          totalTokens,
          cost,
        },
      };
    }

    beautifulLogger.aiGeneration("response", {
      "quantidade de ações": parsedResponse.actions.length,
      "tipos de ação": parsedResponse.actions.map((a) => a.type).join(", "),
    });

    const convertedActions: BotResponse = parsedResponse.actions.map((action) => {
      const result: ResponseAction = {};

      if (action.type === "message" && action.message) {
        result.message = action.message;
      } else if (action.type === "sticker" && action.sticker) {
        result.sticker = action.sticker;
      } else if (action.type === "audio" && action.audio) {
        result.audio = action.audio;
      } else if (action.type === "poll" && action.poll) {
        result.poll = action.poll;
      } else if (action.type === "location" && action.location) {
        result.location = action.location;
      } else if (action.type === "meme" && action.meme) {
        result.meme = action.meme;
      } else if (action.type === "contact" && action.contact) {
        result.contact = action.contact;
      }

      return result;
    });

    beautifulLogger.aiGeneration("complete", {
      "ações processadas": convertedActions.length,
      "pronto para enviar": "sim",
    });

    return {
      actions: convertedActions,
      cost: {
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
      },
    };
  } catch (error) {
    beautifulLogger.aiGeneration("error", {
      erro: "Falha ao fazer parse da resposta JSON",
      "conteúdo recebido": content.substring(0, 100) + "...",
    });
    console.error("Erro ao fazer parse da resposta JSON:", error);
    console.error("Conteúdo recebido:", content);
    throw new Error("Resposta da IA não está no formato JSON válido");
  }
}
