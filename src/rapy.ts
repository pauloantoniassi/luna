import path from "path";
import generateResponse, { Message } from "./inteligence/generateResponse";
import Whatsapp from "./managers/Whatsapp";
import database from "./utils/database";
import debounce from "./utils/debounce";
import generateSummary from "./inteligence/generateSummary";
import getHomeDir from "./utils/getHomeDir";
import log from "./utils/log";

let messages: Message = [];
let lastRapyResponseTime = 0;

export default async function rapy(whatsapp: Whatsapp) {
  const db = database();
  let isGenerating = false;
  let recentMessageTimes: number[] = [];

  whatsapp.registerMessageHandler(async (sessionId, msg, type, senderInfo) => {
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
    if (content.length > 300) return;

    if (messages.length > 10) {
      debounce(
        async () => {
          const summary = await generateSummary(db.getAll(), messages);
          db.set("summary", summary.summary);
          db.set("opinions", summary.opinions);
          db.save();
          messages = [];
        },
        1000 * 60 * 5,
        "debounce-summary"
      );
    }

    const isRapyMentioned = content.toLowerCase().includes("rapy");
    const isGroupActive = () => {
      if (recentMessageTimes.length < 4) return "normal";

      const intervals = [];
      for (let i = 1; i < recentMessageTimes.length; i++) {
        intervals.push(recentMessageTimes[i] - recentMessageTimes[i - 1]);
      }

      const averageInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

      if (averageInterval <= 5 * 1000) return "very_active";
      if (averageInterval <= 9 * 1000) return "active";

      return "normal";
    };

    const getDebounceTime = () => {
      const activity = isGroupActive();
      if (activity === "very_active") return 8 * 1000 + Math.random() * 4 * 1000;
      if (activity === "active") return 5 * 1000 + Math.random() * 3 * 1000;
      return 2 * 1000 + Math.random() * 2 * 1000;
    };

    const processResponse = async () => {
      const timeSinceLastResponse = Date.now() - lastRapyResponseTime;
      const minTimeBetweenResponses = isGroupActive() === "very_active" ? 15 * 1000 : 8 * 1000;

      if (timeSinceLastResponse < minTimeBetweenResponses && !isRapyMentioned) {
        return;
      }

      isGenerating = true;
      try {
        whatsapp.setTyping(sessionId);
        const result = await generateResponse(db.getAll(), messages);
        const response = result.actions;

        try {
          const l = log();
          l.add({
            input: messages[messages.length - 1].content,
            output: JSON.stringify(response, null, 2),
          });
          l.save();
        } catch (error) {
          console.error("Error saving log:", error);
        }

        if (response.length === 0) {
          isGenerating = false;
          whatsapp.pauseTyping(sessionId);
          return;
        }

        lastRapyResponseTime = Date.now();

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
            const stickerPath = path.join(getHomeDir(), "stickers", action.sticker);
            await whatsapp.sendSticker(sessionId, stickerPath);
            messages.push({
              content: `(Rapy): <usou o sticker ${action.sticker}>`,
              name: "Rapy",
              jid: "",
              ia: true,
            });
          } else if (action.audio) {
            const audioPath = path.join(getHomeDir(), "audios", action.audio);
            await whatsapp.sendAudio(sessionId, audioPath);
            messages.push({
              content: `(Rapy): <enviou o áudio ${action.audio}>`,
              name: "Rapy",
              jid: "",
              ia: true,
            });
          } else if (action.meme) {
            const memePath = path.join(getHomeDir(), "memes", action.meme);
            await whatsapp.sendImage(sessionId, memePath);
            messages.push({
              content: `(Rapy): <enviou o meme ${action.meme}>`,
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
          } else if (action.contact) {
            messages.push({
              content: `(Rapy): <enviou um contato (${action.contact.name} (${action.contact.cell}))>`,
              name: "Rapy",
              jid: "",
              ia: true,
            });
            await whatsapp.sendContact(sessionId, action.contact.cell, action.contact.name);
          }

          await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));
        }
      } catch (error) {
        console.error("Erro ao gerar resposta:", error);
      } finally {
        whatsapp.setOnline(sessionId);
        isGenerating = false;
      }
    };

    if (isRapyMentioned) {
      await processResponse();
    } else {
      const debounceTime = getDebounceTime();
      debounce(processResponse, debounceTime, "debounce-response");
    }
  });

  await whatsapp.init();
}
