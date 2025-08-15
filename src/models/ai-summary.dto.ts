import {z} from "zod";

export const AISummaryZod = z.object({
  summary: z.string().describe("Resumo detalhado da conversa"),
  //key_moments: z.array(z.string()).describe("Momentos importantes da conversa")
});

export type AISummaryType = z.infer<typeof AISummaryZod>;
