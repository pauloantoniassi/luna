import {z} from "zod";
import {AssetService, AssetType} from "../services/asset.service";

const AIActionZod = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message").describe("Tipo da ação"),
    message: z.object({
      reply: z.string().optional().describe("ID da mensagem que está sendo respondida (opcional - apenas se não estiver respondendo a mais recente)"),
      text: z.string().describe("Resposta com personalidade passivo-agressiva/irônica (máximo 300 caracteres)"),
    }),
  }),
  z.object({
    type: z.literal("sticker").refine(sticker=>AssetService.getInstance().is(AssetType.STICKER, sticker)).describe("Tipo da ação"),
    sticker: z.string().describe("Nome do arquivo de sticker da lista disponível"),
  }),
  z.object({
    type: z.literal("audio").refine(audio=>AssetService.getInstance().is(AssetType.AUDIO, audio)).describe("Tipo da ação"),
    audio: z.string().describe("Nome do arquivo de áudio da lista disponível"),
  }),
  z.object({
    type: z.literal("poll").describe("Tipo da ação"),
    poll: z.object({
      question: z.string().describe("Pergunta irônica/engraçada para a enquete"),
      options: z.array(z.string()).describe("2 a 3 opções para a enquete")
    }),
  }),
  z.object({
    type: z.literal("location").describe("Tipo da ação"),
    location: z.object({
      latitude: z.number().describe("Latitude da localização"),
      longitude: z.number().describe("Longitude da localização")
    }),
  }),
  z.object({
    type: z.literal("meme").refine(meme=>AssetService.getInstance().is(AssetType.MEME, meme)).describe("Tipo da ação"),
    meme: z.string().describe("Nome do arquivo de meme da lista disponível")
  }),
  z.object({
    type: z.literal("contact").describe("Tipo da ação"),
    contact: z.object({
      name: z.string().describe("Nome do contato"),
      cell: z.string().describe("Número de celular do contato")
    })
  }),
])

export const AIChatResponseZod = z.object({
  actions: z.array(AIActionZod).describe(
    `Array de ações a serem executadas pelo bot. Normalmente será apenas 1, mas até 3 são consideradas aceitáveis. 
Será 0 se nenhuma ação for necessária (ignorar as últimas mensagens).`),
})

export type AIChatResponseType = z.infer<typeof AIChatResponseZod>;
