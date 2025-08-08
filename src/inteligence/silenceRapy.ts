import { proto } from "@whiskeysockets/baileys";
import getHomeDir from "../utils/getHomeDir";
import path from "path";
import Whatsapp from "../managers/Whatsapp";
import { Message } from "./generateResponse";
import beautifulLogger from "../utils/beautifulLogger";
import DEFAULT_MESSAGES from "../constants/DEFAULT_MESSAGES";

export default async function silenceRapy(
  whatsapp: Whatsapp,
  sessionId: string,
  msg: proto.IWebMessageInfo,
  messages: Message,
  silenced: boolean
) {
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (!content) return { silenced, messages };
  const messageId = msg.key.id;

  if (content === "/rapy-cala-boca") {
    const stickerPath = path.join(getHomeDir(), "stickers", "silenciado.webp");
    await whatsapp.sendSticker(sessionId, stickerPath);
    messages.push({
      content: `(Rapy): <usou o sticker silenciado.webp>`,
      name: "Rapy",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("sticker", {
      arquivo: "silenciado.webp",
    });

    await whatsapp.sendText(sessionId, DEFAULT_MESSAGES.SILENCED);
    messages.push({
      content: `(Rapy): ${DEFAULT_MESSAGES.SILENCED}`,
      name: "Rapy",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("message", {
      tipo: "mensagem normal",
      conteúdo:
        DEFAULT_MESSAGES.SILENCED.substring(0, 50) +
        (DEFAULT_MESSAGES.SILENCED.length > 50 ? "..." : ""),
    });

    return {
      silenced: true,
      messages,
    };
  }

  if (content === "/rapy-liberado") {
    const stickerPath = path.join(getHomeDir(), "stickers", "livre-para-falar.webp");
    await whatsapp.sendSticker(sessionId, stickerPath);
    messages.push({
      content: `(Rapy): <usou o sticker livre-para-falar.webp>`,
      name: "Rapy",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("sticker", {
      arquivo: "livre-para-falar.webp",
    });

    await whatsapp.sendText(sessionId, DEFAULT_MESSAGES.UNSILENCED);
    messages.push({
      content: `(Rapy): ${DEFAULT_MESSAGES.UNSILENCED}`,
      name: "Rapy",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("message", {
      tipo: "mensagem normal",
      conteúdo:
        DEFAULT_MESSAGES.UNSILENCED.substring(0, 50) +
        (DEFAULT_MESSAGES.UNSILENCED.length > 50 ? "..." : ""),
    });

    return {
      silenced: false,
      messages,
    };
  }

  if (silenced && content.toLowerCase().includes("rapy")) {
    if (messageId) {
      await whatsapp.sendTextReply(sessionId, messageId, DEFAULT_MESSAGES.TRYING_TO_SPEAK);
    } else {
      await whatsapp.sendText(sessionId, DEFAULT_MESSAGES.TRYING_TO_SPEAK);
    }

    messages.push({
      content: `(Rapy): ${DEFAULT_MESSAGES.TRYING_TO_SPEAK}`,
      name: "Rapy",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("message", {
      tipo: "mensagem normal",
      conteúdo:
        DEFAULT_MESSAGES.TRYING_TO_SPEAK.substring(0, 50) +
        (DEFAULT_MESSAGES.TRYING_TO_SPEAK.length > 50 ? "..." : ""),
    });

    return {
      silenced: true,
      messages,
    };
  }

  return {
    silenced,
    messages,
  };
}
