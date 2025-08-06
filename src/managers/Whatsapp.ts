import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  WAMessageContent,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { LoggerConfig } from "../utils/logger";

export type MessageHandler = (
  sessionId: string,
  msg: proto.IWebMessageInfo,
  type: "text" | "image" | "audio" | "document",
  senderInfo?: {
    jid: string;
    name?: string;
  }
) => void;

export default class Whatsapp {
  private sock: WASocket | undefined;
  private onMessage?: MessageHandler;

  /**
   * Inicializa a conexão com o WhatsApp, gerando um QR code no terminal para autenticação.
   */
  async init() {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    this.sock = makeWASocket({
      auth: state,
      logger: LoggerConfig.forBaileys(process.env.NODE_ENV === "production" ? "error" : "warn"),
    });

    this.sock.ev.on("creds.update", saveCreds);

    this.sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        qrcode.generate(qr, { small: true }, (qrCode) => {
          console.log("Escaneie o QR code abaixo para conectar:");
          console.log(qrCode);
        });
      }

      if (connection === "close") {
        const shouldReconnect =
          (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        if (shouldReconnect) {
          this.init();
        } else {
          console.log("Desconectado. Faça login novamente.");
        }
      } else if (connection === "open") {
        console.log("✅ Conectado ao WhatsApp");
      }
    });

    this.sock!.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;
      for (const msg of messages) {
        const sessionId = msg.key.remoteJid;

        const content = msg.message as WAMessageContent;
        if (!content || !sessionId) return;

        if (!sessionId.endsWith("@g.us")) return;

        let senderInfo: { jid: string; name?: string } | undefined;

        if (msg.key.participant) {
          senderInfo = {
            jid: msg.key.participant,
            name: msg.pushName || undefined,
          };
        }

        if (content.conversation || content.extendedTextMessage) {
          this.onMessage?.(sessionId, msg, "text", senderInfo);
        } else if (content.imageMessage) {
          this.onMessage?.(sessionId, msg, "image", senderInfo);
        } else if (content.audioMessage) {
          this.onMessage?.(sessionId, msg, "audio", senderInfo);
        } else if (content.documentMessage) {
          this.onMessage?.(sessionId, msg, "document", senderInfo);
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

  /**
   * Registra um callback para ser chamado quando uma nova mensagem for recebida.
   * @param handler Função que será chamada quando uma nova mensagem for recebida
   */
  registerMessageHandler(handler: MessageHandler) {
    this.onMessage = handler;
  }

  /**
   * Envia uma mensagem de texto para um usuário ou grupo do WhatsApp.
   * @param jid O ID do WhatsApp (ex.: '1234567890@s.whatsapp.net' para usuários, '123456789-123456@g.us' para grupos)
   * @param text A mensagem de texto a ser enviada
   */
  async sendText(jid: string, text: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, { text });
  }

  /**
   * Envia uma figurinha para um usuário ou grupo do WhatsApp.
   * @param jid O ID do WhatsApp
   * @param filePath O caminho para o arquivo de figurinha no formato webp
   */
  async sendSticker(jid: string, filePath: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, { sticker: { url: filePath } });
  }

  /**
   * Cria e envia uma enquete para um usuário ou grupo do WhatsApp.
   * @param jid O ID do WhatsApp
   * @param name O nome da enquete
   * @param options As opções da enquete
   * @param selectableCount O número de opções que podem ser selecionadas (padrão: 1)
   */
  async createPoll(jid: string, name: string, options: string[], selectableCount: number = 1) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, { poll: { name, values: options, selectableCount } });
  }

  /**
   * Envia uma localização para um usuário ou grupo do WhatsApp.
   * @param jid O ID do WhatsApp
   * @param latitude A latitude da localização
   * @param longitude A longitude da localização
   */
  async sendLocation(jid: string, latitude: number, longitude: number) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, {
      location: { degreesLatitude: latitude, degreesLongitude: longitude },
    });
  }

  /**
   * Envia uma mensagem de áudio para um usuário ou grupo do WhatsApp.
   * @param jid O ID do WhatsApp
   * @param filePath O caminho para o arquivo de áudio no formato mp3
   * @nota Arquivos mp3 podem não ser compatíveis com mensagens de voz do WhatsApp, que preferem o formato ogg com codec Opus.
   * Considere converter o arquivo para ogg antes de enviar, usando ferramentas como ffmpeg.
   */
  async sendAudio(jid: string, filePath: string) {
    if (!this.sock) throw new Error("Não conectado");
    await this.sock.sendMessage(jid, {
      audio: { url: filePath },
      ptt: true,
      mimetype: "audio/mpeg",
    });
  }
}
