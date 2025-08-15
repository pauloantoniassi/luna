import {ChatCompletionMessageParam} from "openai/resources";
import {LlmService} from "../services/llm.service";
import { Data } from "../utils/database";
import PERSONALITY_PROMPT from "../constants/PERSONALITY_PROMPT";
import beautifulLogger from "../utils/beautifulLogger";
import {AIChatResponseType, AIChatResponseZod} from "../models/ai-chat-response.dto";
import {z} from "zod";

export type Message = {
  content: string;
  name: string | undefined;
  ia: boolean;
  jid: string;
}[];

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
      formattedData += `👥 OPINIÕES SOBRE OS USUÁRIOS:\n`;
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

  beautifulLogger.aiGeneration("processing", "Enviando requisição para OpenAI...");

  const response = await LlmService.getInstance().callText(
    inputMessages,
    { schema: z.toJSONSchema(AIChatResponseZod), name: "ai_chat_response" }
  )

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
