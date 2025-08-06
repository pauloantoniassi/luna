import path from "path";
import generateResponse, { Message } from "./inteligence/generateResponse";
import Whatsapp from "./managers/Whatsapp";
import database from "./utils/database";
import debounce from "./utils/debounce";

const messages: Message = [];

export default function rapy(whatsapp: Whatsapp) {
  const db = database();
  let isGenerating = false;

  whatsapp.registerMessageHandler((sessionId, msg, type, senderInfo) => {
    if (type !== "text") return;
    const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!content || !senderInfo) return;

    const senderJid = senderInfo.jid;
    const senderName = senderInfo.name || "Desconhecido";

    const messageId = msg.key.id;

    messages.push({
      content: `(${senderName}{userid: ${senderJid} (messageid: ${messageId})}): ${content}`,
      name: senderName,
      jid: senderJid,
      ia: false,
    });

    if (isGenerating) return;

    debounce(async () => {
      isGenerating = true;
      try {
        const response = await generateResponse(db.getAll(), messages);
        if (response.length === 0) return;
        for (const action of response) {
          if (action.message) {
            if (action.message.repply) {
              const message = action.message.text;
              await whatsapp.sendTextReply(sessionId, action.message.repply, message);
            } else {
              const message = action.message.text;
              await whatsapp.sendText(sessionId, message);
            }
          } else if (action.sticker) {
            const stickerPath = path.join(__dirname, "..", "stickers", action.sticker);
            await whatsapp.sendSticker(sessionId, stickerPath);
          } else if (action.poll) {
            await whatsapp.createPoll(sessionId, action.poll.question, action.poll.options);
          } else if (action.location) {
            await whatsapp.sendLocation(
              sessionId,
              action.location.latitude,
              action.location.longitude
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } catch (error) {
        console.error("Erro ao gerar resposta:", error);
      } finally {
        isGenerating = false;
      }
    }, 1 * 1000);
  });
}
