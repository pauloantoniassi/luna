import {z} from "zod";

const AIActionZod = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    message: z.object({
      reply: z.string().optional(),
      text: z.string(),
    }),
  }),
  z.object({
    type: z.literal("sticker"),
    sticker: z.string(),
  }),
  z.object({
    type: z.literal("audio"),
    audio: z.string(),
  }),
  z.object({
    type: z.literal("poll"),
    poll: z.object({
      question: z.string(),
      options: z.array(z.string())
    })
  }),
  z.object({
    type: z.literal("location"),
    location: z.object({
      latitude: z.number(),
      longitude: z.number()
    })
  }),
  z.object({
    type: z.literal("meme"),
    meme: z.string()
  }),
  z.object({
    type: z.literal("contact"),
    contact: z.object({
      name: z.string(),
      cell: z.string()
    })
  }),
])

export const AIChatResponseZod = z.object({
  actions: z.array(AIActionZod)
})

export type AIChatResponseType = z.infer<typeof AIChatResponseZod>;
