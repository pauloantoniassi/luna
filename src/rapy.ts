import path from "path";
import generateResponse, { Message } from "./inteligence/generateResponse";
import Whatsapp from "./managers/Whatsapp";
import database from "./utils/database";
import debounce from "./utils/debounce";
import generateSummary from "./inteligence/generateSummary";

let messages: Message = [];

export default function rapy(whatsapp: Whatsapp) {
  const db = database();
  let isGenerating = false;
  let lastMessageTime = 0;
  let recentMessageTimes: number[] = [];

  whatsapp.registerMessageHandler(async (sessionId, msg, type, senderInfo) => {
    console.log("Nova mensagem recebida :", type, msg);

    if (type !== "text") return;
    const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!content || !senderInfo) return;

    const senderJid = senderInfo.jid;
    const senderName = senderInfo.name || "Desconhecido";

    const messageId = msg.key.id;
    const currentTime = Date.now();

    recentMessageTimes.push(currentTime);

    if (recentMessageTimes.length > 10) {
      recentMessageTimes.shift();
    }

    const threeMinutesAgo = currentTime - 3 * 60 * 1000;
    recentMessageTimes = recentMessageTimes.filter((time) => time > threeMinutesAgo);

    messages.push({
      content: `(${senderName}{userid: ${senderJid} (messageid: ${messageId})}): ${content}`,
      name: senderName,
      jid: senderJid,
      ia: false,
    });

    if (isGenerating) return;

    if (messages.length > 100) {
      const summary = await generateSummary(db.getAll(), messages);
      db.set("summary", summary.summary);
      db.set("opinions", summary.opinions);
      db.save();
      messages = [];
    }

    const isRapyMentioned = content.toLowerCase().includes("rapy");
    const isGroupActive = () => {
      if (recentMessageTimes.length < 3) return false;

      const intervals = [];
      for (let i = 1; i < recentMessageTimes.length; i++) {
        intervals.push(recentMessageTimes[i] - recentMessageTimes[i - 1]);
      }

      const averageInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

      return averageInterval < 30 * 1000;
    };

    const getDebounceTime = () => {
      return isGroupActive() ? 3 * 1000 : 1 * 1000;
    };

    const processResponse = async () => {
      isGenerating = true;
      try {
        const response = await generateResponse(db.getAll(), messages);
        if (response.length === 0) return;
        for (const action of response) {
          if (action.message) {
            if (action.message.repply) {
              const message = action.message.text;
              await whatsapp.sendTextReply(sessionId, action.message.repply, message);
              messages.push({
                content: `(Rapy): ${message}`,
                name: "Rapy",
                jid: "",
                ia: true,
              });
            } else {
              const message = action.message.text;
              await whatsapp.sendText(sessionId, message);
              messages.push({
                content: `(Rapy): ${message}`,
                name: "Rapy",
                jid: "",
                ia: true,
              });
            }
          } else if (action.sticker) {
            const stickerPath = path.join(__dirname, "..", "stickers", action.sticker);
            await whatsapp.sendSticker(sessionId, stickerPath);
            messages.push({
              content: `(Rapy): <usou o sticker ${action.sticker}>`,
              name: "Rapy",
              jid: "",
              ia: true,
            });
          } else if (action.poll) {
            await whatsapp.createPoll(sessionId, action.poll.question, action.poll.options);
            messages.push({
              content: `(Rapy): <criou uma enquete: ${action.poll.question}>`,
              name: "Rapy",
              jid: "",
              ia: true,
            });
          } else if (action.location) {
            messages.push({
              content: `(Rapy): <enviou uma localização (${action.location.latitude}, ${action.location.longitude})>`,
              name: "Rapy",
              jid: "",
              ia: true,
            });
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
    };

    if (isRapyMentioned) {
      await processResponse();
    } else {
      const debounceTime = getDebounceTime();
      console.log(
        `Grupo ${isGroupActive() ? "agitado" : "normal"}, usando debounce de ${
          debounceTime / 1000
        }s`
      );
      debounce(processResponse, debounceTime);
    }
  });
}
