import POSSIBLE_RESPONSE_PROMPT from "../constants/POSSIBLE_RESPONSE_PROMPT";
import openai from "../services/openai";
import { Data } from "../utils/database";
import { Message } from "./generateResponse";

export default async function isPossibleResponse(data: Data, messages: Message) {
  const messagesMaped: string = messages
    .slice(-30)
    .map((message) => message.content)
    .join("\n");

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

  const responseSchema = {
    type: "json_schema" as const,
    json_schema: {
      name: "possible_response",
      strict: true,
      schema: {
        type: "object",
        properties: {
          possible: {
            type: "boolean",
          },
          reason: {
            type: "string",
            description: "Motivo pelo qual a resposta é considerada possível ou não.",
          },
        },
        required: ["possible", "reason"],
        additionalProperties: false,
      },
    },
  };

  const response = await openai.chat.completions.create({
    model: "gpt-4.1-nano",
    messages: [
      { role: "system", content: POSSIBLE_RESPONSE_PROMPT },
      {
        role: "assistant",
        content: `Opiniões já formadas dos usuários: ${contextData}`,
      },
      {
        role: "user",
        content: `Conversa: \n\n${messagesMaped}`,
      },
    ],
    response_format: responseSchema,
    max_tokens: 30,
  });

  const content = response.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Nenhuma resposta foi gerada pela IA");
  }

  try {
    console.log("Conteúdo do resumo recebido:", content);

    const parsedResponse = JSON.parse(content);

    if (!("possible" in parsedResponse)) {
      throw new Error("Resposta não contém possible");
    }

    return parsedResponse as { possible: boolean; reason: string };
  } catch (error) {
    console.error("Erro ao fazer parse da resposta do resumo:", error);
    console.error("Conteúdo recebido:", content);
    throw new Error("Resposta da IA para resumo não está no formato JSON válido");
  }
}
