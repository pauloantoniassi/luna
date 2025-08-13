import { proto } from "@whiskeysockets/baileys";
import getHomeDir from "../utils/getHomeDir";
import path from "path";
import Whatsapp from "../managers/Whatsapp";
import { Message } from "./generateResponse";
import beautifulLogger from "../utils/beautifulLogger";
import DEFAULT_MESSAGES from "../constants/DEFAULT_MESSAGES";

export default async function silenceLuna(
  whatsapp: Whatsapp,
  sessionId: string,
  msg: proto.IWebMessageInfo,
  messages: Message,
  silenced: boolean
) {
  const content = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
  if (!content) return { silenced, messages };
  const messageId = msg.key.id;

  if (content === "/luna-cala-boca") {
    const stickerPath = path.join(getHomeDir(), "stickers", "silenciado.webp");
    await whatsapp.sendSticker(sessionId, stickerPath);
    messages.push({
      content: `(Luna): <usou o sticker silenciado.webp>`,
      name: "Luna",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("sticker", {
      arquivo: "silenciado.webp",
    });

    await whatsapp.sendText(sessionId, DEFAULT_MESSAGES.SILENCED);
    messages.push({
      content: `(Luna): ${DEFAULT_MESSAGES.SILENCED}`,
      name: "Luna",
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

  if (content === "/luna-liberado") {
    const stickerPath = path.join(getHomeDir(), "stickers", "livre-para-falar.webp");
    await whatsapp.sendSticker(sessionId, stickerPath);
    messages.push({
      content: `(Luna): <usou o sticker livre-para-falar.webp>`,
      name: "Luna",
      jid: "",
      ia: true,
    });
    beautifulLogger.actionSent("sticker", {
      arquivo: "livre-para-falar.webp",
    });

    await whatsapp.sendText(sessionId, DEFAULT_MESSAGES.UNSILENCED);
    messages.push({
      content: `(Luna): ${DEFAULT_MESSAGES.UNSILENCED}`,
      name: "Luna",
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

  if (silenced && content.toLowerCase().includes("luna")) {
    if (messageId) {
      await whatsapp.sendTextReply(sessionId, messageId, DEFAULT_MESSAGES.TRYING_TO_SPEAK);
    } else {
      await whatsapp.sendText(sessionId, DEFAULT_MESSAGES.TRYING_TO_SPEAK);
    }

    messages.push({
      content: `(Luna): ${DEFAULT_MESSAGES.TRYING_TO_SPEAK}`,
      name: "Luna",
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
