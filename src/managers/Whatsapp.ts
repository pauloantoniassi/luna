import { Boom } from "@hapi/boom";
import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  WAMessageContent,
  proto,
  WAPresence,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { appLogger, LoggerConfig } from "../utils/logger";
import debounce from "../utils/debounce";
import fs from "fs";
import path from "path";
import getProjectRootDir from "../utils/getProjectRootDir";
import NodeCache from "node-cache";
import { AppDataSource } from "../services/database";
import { Contact } from "../entities/Contact";
import { ChatContextService } from "../services/chat-context.service"; // Added import

export type MessageHandler = (
  sessionId: string,
  msg: proto.IWebMessageInfo,
  type: "text" | "image" | "audio" | "document",
  senderInfo?: {
    jid: string;
    name?: string;
  }
) => void;

const OFFLINE_DELAY_MS = 60_000;
const CACHE_TTL_SECONDS = 86400; // 24 hours

export default class Whatsapp {
  private sock: WASocket | undefined;
  private onMessage?: MessageHandler;
  private presence: WAPresence = "available";
  private readonly authPath: string;
  private chatCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS });
  private contactCache = new NodeCache({ stdTTL: CACHE_TTL_SECONDS });
  private chatContextService: ChatContextService;

  constructor() {
    this.authPath = path.join(getProjectRootDir(), "user-data/whatsapp/auth");
    this.chatContextService = new ChatContextService();
  }

  async init() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
    this.sock = makeWASocket({
      auth: state,
      logger: LoggerConfig.forBaileys(),
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrcode.generate(qr, { small: true }, (qrCode) => {
          console.log("Escaneie o QR code abaixo para conectar:");
          console.log(qrCode);
        });
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !==
          DisconnectReason.loggedOut;
        if (shouldReconnect) {
          await this.init();
        } else {
          console.log("Desconectado. Faça login novamente.");
          fs.rmSync(this.authPath, { recursive: true, force: true });
        }
      } else if (connection === "open") {
        console.log("✅ Conectado ao WhatsApp");

        // --- DB LOGIC: REGISTER ME ---
        try {
          const meId = this.sock?.user?.id;
          if (meId) {
            const contactRepository = AppDataSource.getRepository(Contact);
            let meContact = await contactRepository.findOne({ where: { waContactId: meId } });
            if (!meContact) {
              meContact = contactRepository.create({
                waContactId: meId,
                pushName: "Luna (Eu)",
              });
              await contactRepository.save(meContact);
              appLogger.info("Contato 'eu' registrado no banco de dados.");
            }
            // ADICIONADO: Cachear o contato do bot
            if (meContact) this.contactCache.set(meId, meContact);
          }
        } catch (dbError) {
          appLogger.error({ error: dbError }, "Erro ao registrar 'eu' no banco de dados.");
        }
        // --- END DB LOG ---

        this.debounceOffline();
      }
    });

    this.sock!.ev.on("messages.upsert", async ({ messages, type }) => {
      for (const msg of messages) {
        const waChatId = msg.key.remoteJid;

        const content = msg.message as WAMessageContent;
        if (!content || !waChatId) return;

        if (!waChatId.endsWith("@g.us")) {
          appLogger.warn("Mensagem recebida fora de grupo, ignorando.", { from: waChatId });
          return;
        }

        let senderInfo: { jid: string; name?: string } | undefined;

        if (msg.key.participant) {
          senderInfo = {
            jid: msg.key.participant,
            name: msg.pushName || undefined,
          };
        }

        // --- DB & CACHE LOG ---
        await this.chatContextService.saveMessageFromWA(
            msg,
            this.sock?.user,
            this.chatCache,
            this.contactCache
        );
        // --- END DB & CACHE LOG ---

        // Ignore messages that are not notifications                                                                                                                                  │
        // Messages that are "append" are for history only                                                                                                                             │
        if (type !== "notify") continue;

        this.debounceOffline();

        if(msg.key.fromMe) continue; // Ignore mensagens enviadas pelo próprio bot

        if (this.presence === "unavailable") {
          await this.sock!.sendPresenceUpdate("available");
          this.presence = "available";
        }

        if (content.conversation || content.extendedTextMessage) {
          this.onMessage?.(waChatId, msg, "text", senderInfo);
        } else if (content.imageMessage) {
          this.onMessage?.(waChatId, msg, "image", senderInfo);
        } else if (content.audioMessage) {
          this.onMessage?.(waChatId, msg, "audio", senderInfo);
        } else if (content.documentMessage) {
          this.onMessage?.(waChatId, msg, "document", senderInfo);
        }
      }
    });

    await new Promise((resolve) => {
      this.sock!.ev.on("connection.update", (update) => {
        if (update.connection === "open") {
          resolve(undefined);
        }
      });
    });
  }

  registerMessageHandler(handler: MessageHandler) {
    this.onMessage = handler;
  }

  private debounceOffline() {
    debounce(
      async () => {
        try {
          await this.sock!.sendPresenceUpdate("unavailable");
          this.presence = "unavailable";
        } catch {}
      },
      OFFLINE_DELAY_MS,
      "debounce-offline"
    );
  }

  async sendText(jid: string, text: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, { text });
  }

  async sendTextReply(jid: string, replyTo: string, text: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(
      jid,
      { text },
      {
        quoted: {
          key: { id: replyTo, remoteJid: jid },
          message: {},
        },
      }
    );
  }

  async sendSticker(jid: string, filePath: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, { sticker: { url: filePath } });
  }

  async sendContact(jid: string, cell: string, name?: string) {
    if (!this.sock) throw new Error("Não conectado");
    const vcard =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      `FN:${name}\n` +
      `TEL;TYPE=CELL:${cell.replace(/\D/g, "")}\n` +
      "END:VCARD";

    await this.sock!.sendMessage(jid, {
      contacts: {
        displayName: name,
        contacts: [{ vcard }],
      },
    });
  }

  async createPoll(jid: string, name: string, options: string[], selectableCount: number = 1) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, { poll: { name, values: options, selectableCount } });
  }

  async sendLocation(jid: string, latitude: number, longitude: number) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, {
      location: { degreesLatitude: latitude, degreesLongitude: longitude },
    });
  }

  async sendImage(jid: string, filePath: string) {
    if (!this.sock) throw new Error("Não conectado");

    try {
      const imageBuffer = fs.readFileSync(filePath);
      await this.sock.sendMessage(jid, {
        image: imageBuffer,
        mimetype: "image/jpeg",
      });
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      throw error;
    }
  }

  async sendAudio(jid: string, filePath: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, {
      audio: { url: filePath },
      ptt: true,
      mimetype: "audio/mpeg",
    });
  }

  private async updatePresence(to: string, presence: WAPresence) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendPresenceUpdate(presence, to);
  }

  async setOnline(to: string) {
    await this.updatePresence(to, "available");
  }

  async setOffline(to: string) {
    await this.updatePresence(to, "unavailable");
  }

  async setTyping(to: string) {
    await this.updatePresence(to, "composing");
  }

  async pauseTyping(to: string) {
    await this.updatePresence(to, "paused");
  }
}
