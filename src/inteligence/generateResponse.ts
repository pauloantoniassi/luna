import { ChatCompletionMessageParam } from "openai/resources";
import openai from "../services/openai";
import { Data } from "../utils/database";
import PERSONALITY_PROMPT from "../constants/PERSONALITY_PROMPT";

export type Message = {
  content: string;
  name: string | undefined;
  ia: boolean;
  jid: string;
}[];

export type ResponseAction = {
  message?: {
    repply?: string;
    text: string;
  };
  sticker?: string;
  poll?: {
    question: string;
    options: [string, string, string];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
};

type ApiResponseAction = {
  type: "message" | "sticker" | "poll" | "location";
  message?: {
    repply?: string; // Opcional novamente
    text: string;
  };
  sticker?: string;
  poll?: {
    question: string;
    options: [string, string, string];
  };
  location?: {
    latitude: number;
    longitude: number;
  };
};

export type BotResponse = ResponseAction[];

export default async function generateResponse(
  data: Data,
  messages: Message
): Promise<BotResponse> {
  const sanitizeName = (name: string | undefined): string | undefined => {
    if (!name) return undefined;
    return name.replace(/[\s<|\\/>&]+/g, "_").substring(0, 64);
  };

  const messagesMaped: ChatCompletionMessageParam[] = messages.map((message) => {
    if (message.ia) {
      return {
        role: "assistant",
        content: message.content,
      };
    } else {
      const sanitizedName = sanitizeName(message.name);
      const userMessage: ChatCompletionMessageParam = {
        role: "user",
        content: message.content,
      };

      if (sanitizedName) {
        userMessage.name = sanitizedName;
      }

      return userMessage;
    }
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

  const stickerOptions = [
    "bravo.webp",
    "chorando-muito.webp",
    "chorando-pouco.webp",
    "emburrado.webp",
    "entediado.webp",
    "feliz.webp",
    "pedindo-desculpas.webp",
    "pensando.webp",
    "rindo-fininho.webp",
    "se-perguntando.webp",
    "surpreso.webp",
    "suspeito.webp",
  ];

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
                  enum: ["message", "sticker", "poll", "location"],
                  description: "Tipo da ação",
                },
                message: {
                  type: "object",
                  properties: {
                    repply: {
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

  const response = await openai.chat.completions.create({
    model: "gpt-4.1",
    messages: [
      { role: "system", content: PERSONALITY_PROMPT },
      { role: "assistant", content: contextData },
      ...messagesMaped,
    ],
    response_format: responseSchema,
    temperature: 0.8,
    max_tokens: 1000,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Nenhuma resposta foi gerada pela IA");
  }

  try {
    console.log("Conteúdo recebido:", content);

    const parsedResponse: { actions: ApiResponseAction[] } = JSON.parse(content);

    // Converte da estrutura da API para a estrutura esperada
    const convertedActions: BotResponse = parsedResponse.actions.map((action) => {
      const result: ResponseAction = {};

      if (action.type === "message" && action.message) {
        result.message = action.message;
      } else if (action.type === "sticker" && action.sticker) {
        result.sticker = action.sticker;
      } else if (action.type === "poll" && action.poll) {
        result.poll = action.poll;
      } else if (action.type === "location" && action.location) {
        result.location = action.location;
      }

      return result;
    });

    return convertedActions;
  } catch (error) {
    console.error("Erro ao fazer parse da resposta JSON:", error);
    console.error("Conteúdo recebido:", content);
    throw new Error("Resposta da IA não está no formato JSON válido");
  }
}
