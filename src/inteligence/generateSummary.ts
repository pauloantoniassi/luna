import { ChatCompletionMessageParam } from "openai/resources";
import openai from "../services/openai";
import { Data } from "../utils/database";
import SUMMARY_PROMPT from "../constants/SUMMARY_PROMPT";

export type Message = {
  content: string;
  name: string | undefined;
  ia: boolean;
  jid: string;
}[];

export type ResponseAction = {
  summary: string;
  opinions: {
    name: string;
    opinion: number;
    jid: string;
    traits: string[];
  }[];
};

export default async function generateSummary(
  data: Data,
  messages: Message
): Promise<ResponseAction> {
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

  const responseSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "summary_response",
      strict: false,
      schema: {
        type: "object",
        properties: {
          summary: {
            type: "string",
            description: "Resumo das conversas e eventos importantes do grupo",
          },
          opinions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Nome da pessoa",
                },
                opinion: {
                  type: "number",
                  minimum: 0,
                  maximum: 100,
                  description: "Opinião sobre a pessoa (0 a 100)",
                },
                jid: {
                  type: "string",
                  description: "ID único da pessoa",
                },
                traits: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  description: "Características observadas da pessoa",
                },
              },
              required: ["name", "opinion", "jid", "traits"],
              additionalProperties: false,
            },
          },
        },
        required: ["summary", "opinions"],
        additionalProperties: false,
      },
    },
  };

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

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SUMMARY_PROMPT },
      {
        role: "assistant",
        content: `Resumo anterior (use ele como base para não perder dados.): ${data.summary}\n\nOpiniões já formadas dos usuários: ${contextData}`,
      },
      ...messagesMaped,
    ],
    response_format: responseSchema,
    temperature: 0.3,
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Nenhuma resposta foi gerada pela IA");
  }

  try {
    console.log("Conteúdo do resumo recebido:", content);

    const parsedResponse = JSON.parse(content);

    if (!parsedResponse.summary || !parsedResponse.opinions) {
      throw new Error("Resposta não contém summary ou opinions");
    }

    if (!Array.isArray(parsedResponse.opinions)) {
      throw new Error("Opinions deve ser um array");
    }

    parsedResponse.opinions.forEach((opinion: any, index: number) => {
      if (
        !opinion.name ||
        typeof opinion.opinion !== "number" ||
        !opinion.jid ||
        !Array.isArray(opinion.traits)
      ) {
        throw new Error(`Opinião ${index} tem estrutura inválida`);
      }

      if (opinion.opinion < 0 || opinion.opinion > 100) {
        throw new Error(`Opinião ${index} tem valor fora do range (0 a 100)`);
      }
    });

    return parsedResponse as ResponseAction;
  } catch (error) {
    console.error("Erro ao fazer parse da resposta do resumo:", error);
    console.error("Conteúdo recebido:", content);
    throw new Error("Resposta da IA para resumo não está no formato JSON válido");
  }
}
