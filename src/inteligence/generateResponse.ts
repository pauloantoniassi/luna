import {ChatCompletionMessageParam} from "openai/resources";
import {LlmService} from "../services/llm.service";
import { Data } from "../utils/database";
import PERSONALITY_PROMPT from "../constants/PERSONALITY_PROMPT";
import * as fs from "fs";
import path from "path";
import getProjectRootDir from "../utils/getProjectRootDir";
import beautifulLogger from "../utils/beautifulLogger";
import {AIChatResponseType, AIChatResponseZod} from "../models/ai-action.dto";

export type Message = {
  content: string;
  name: string | undefined;
  ia: boolean;
  jid: string;
}[];

const stickersDir = path.join(getProjectRootDir(), "assets", "stickers");
if (!fs.existsSync(stickersDir))
  throw new Error("Diretório de stickers não encontrado: " + stickersDir);
const stickerOptions: string[] = fs
  .readdirSync(stickersDir)
  .filter((file) => file.endsWith(".webp"));

const audiosDir = path.join(getProjectRootDir(), "assets", "audios");
if (!fs.existsSync(audiosDir)) throw new Error("Diretório de áudios não encontrado: " + audiosDir);
const audioOptions: string[] = fs.readdirSync(audiosDir).filter((file) => file.endsWith(".mp3"));

const memesDir = path.join(getProjectRootDir(), "assets", "memes");
if (!fs.existsSync(memesDir)) throw new Error("Diretório de memes não encontrado: " + memesDir);
const memeOptions: string[] = fs.readdirSync(memesDir).filter((file) => file.endsWith(".jpg"));

export default async function generateResponse(
  data: Data,
  messages: Message
): Promise<AIChatResponseType> {
  beautifulLogger.aiGeneration("start", "Iniciando geração de resposta...");
  const AI_MODEL = process.env.AI_MODEL;
  // TODO: Use getConfig

  if(!AI_MODEL) {
    beautifulLogger.aiGeneration("error", "Variável de ambiente AI_MODEL não está definida");
    throw new Error("Variável de ambiente AI_MODEL não está definida");
  }

  const uniqueMessages = messages.filter((message, index, array) => {
    return !array.some(
      (otherMessage, otherIndex) =>
        otherIndex > index &&
        otherMessage.content === message.content &&
        otherMessage.name === message.name
    );
  });

  const messagesMapped: string = uniqueMessages
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
      content: `Conversa: \n\n${messagesMapped}`,
    },
  ];

  const responseSchema = {
      name: "bot_response",
      strict: false,
    // TODO: Copy the description to Zod schema and then reuse the zod schema here
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
                      description: "ID da mensagem que está sendo respondida (opcional - apenas se não estiver respondendo a mais recente)",
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
                      minItems: 2,
                      maxItems: 3,
                      description: "2 a 3 opções para a enquete",
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
      }
  };

  beautifulLogger.aiGeneration("processing", "Enviando requisição para OpenAI...");

  const response = await LlmService.getInstance().callText(inputMessages, responseSchema)

  beautifulLogger.aiGeneration("cost", {
    "tokens entrada": response.usage?.prompt_tokens,
    "tokens saída": response.usage?.completion_tokens,
    "tokens total": response.usage?.total_tokens,
  });

  try {
    const parsedResponse: AIChatResponseType = AIChatResponseZod.parse(response.response);

    beautifulLogger.aiGeneration("response", {
      "quantidade de ações": parsedResponse.actions.length,
      "tipos de ação": parsedResponse.actions.map((a) => a.type).join(", "),
    });

    beautifulLogger.aiGeneration("complete", {
      "ações processadas": parsedResponse.actions.length,
      "pronto para enviar": "sim",
    });

    return {
      actions: parsedResponse.actions
    };
  } catch (error) {
    console.error("Erro ao fazer parse da resposta JSON:", error);
    throw new Error("Resposta da IA não está no formato JSON válido");
  }
}
