import { AppDataSource } from "./database";
import { Chat } from "../entities/Chat";
import { Contact } from "../entities/Contact";
import { Message } from "../entities/Message";
import { ChatSummary } from "../entities/ChatSummary";
import { Repository } from "typeorm";
import NodeCache from "node-cache";
import { appLogger } from "../utils/logger";
import { proto, Contact as WAContact } from "@whiskeysockets/baileys";
import { LlmService } from "./llm.service";

export class ChatContextService {
  private chatRepository: Repository<Chat>;
  private contactRepository: Repository<Contact>;
  private messageRepository: Repository<Message>;
  private chatSummaryRepository: Repository<ChatSummary>;
  private llmService: LlmService;

  constructor() {
    this.chatRepository = AppDataSource.getRepository(Chat);
    this.contactRepository = AppDataSource.getRepository(Contact);
    this.messageRepository = AppDataSource.getRepository(Message);
    this.chatSummaryRepository = AppDataSource.getRepository(ChatSummary);
    this.llmService = new LlmService();
  }

  public async getContextForLLM(): Promise<string> {
    let context = ["Contexto da conversa:\n"];

    // TODO: Adicionar resumo da conversa
    // TODO: Adicionar mensagens recentes depois do resumo
    // TODO: Adicionar opiniões dos usuários

    return context.join('\n').trim();
  }

  public async saveMessageFromWA(
    msg: proto.IWebMessageInfo,
    sockUser: WAContact | undefined,
    chatCache: NodeCache,
    contactCache: NodeCache
  ): Promise<void> {
      try {
          const waChatId = msg.key.remoteJid!;
          const waAuthorId = (msg.key.fromMe ? sockUser?.id : msg.key.participant) || waChatId;

          // 1. Get/Find/Create Chat from cache or DB
          let chat: Chat | null = chatCache.get<Chat>(waChatId) || null;
          if (!chat) {
              chat = await this.chatRepository.findOneBy({ waChatId });
              if (!chat) {
                  chat = this.chatRepository.create({ waChatId, messageCount: 0 }); // Initialize messageCount
                  await this.chatRepository.save(chat); // Changed from insert() to save()
              }
              if (chat) chatCache.set(waChatId, chat);
          }

          // 2. Get/Find/Create Author from cache or DB
          let author: Contact | null = contactCache.get<Contact>(waAuthorId) || null;
          if (!author) {
              author = await this.contactRepository.findOneBy({ waContactId: waAuthorId });
              if (!author) {
                  author = this.contactRepository.create({
                      waContactId: waAuthorId,
                      pushName: msg.pushName,
                  });
                  await this.contactRepository.save(author); // Changed from insert() to save()
              }
              if (author) contactCache.set(waAuthorId, author);
          }

          // Add author to chat participants list if not already there.
          if (chat && author) {
              await AppDataSource.createQueryBuilder()
                  .insert()
                  .into("chat_participants")
                  .values({
                      chatId: chat.id,
                      contactId: author.id
                  })
                  .orIgnore()
                  .execute();
          }

          // 3. Save Message
          const messageBody = msg.message?.conversation || msg.message?.extendedTextMessage?.text || "";
          if (msg.key.id && messageBody && chat && author) {
              const newMessage = this.messageRepository.create({
                  waMessageId: msg.key.id,
                  body: messageBody,
                  fromMe: msg.key.fromMe || false,
                  timestamp: new Date(Number(msg.messageTimestamp) * 1000),
                  chat: chat,
                  author: author,
              });
              await this.messageRepository.insert(newMessage); // Changed from insert() to save()

              // Increment message count and save chat
              chat.messageCount = (chat.messageCount || 0) + 1;
              await this.chatRepository.save(chat);

              // Check for summary trigger
              if (chat.messageCount % 50 === 0) {
                  await this.createChatSummary(chat, newMessage); // Added newMessage parameter
              }
          }
      } catch (dbError) {
          appLogger.error({ error: dbError }, "Erro ao salvar mensagem no banco de dados.");
      }
  }

  private async createChatSummary(chat: Chat, lastMessage: Message): Promise<void> { // Added lastMessage parameter
      appLogger.info(`Gerando resumo para o chat ${chat.waChatId} na mensagem ${lastMessage.waMessageId}`);

      try {
          // 1. Determine the range of messages to summarize
          const lastSummary = await this.chatSummaryRepository.findOne({
              where: { chat: { id: chat.id } },
              order: { createdAt: 'DESC' },
              relations: ['lastMessage'], // Load the lastMessage relation
          });

          let queryBuilder = this.messageRepository.createQueryBuilder('message')
              .where('message.chatId = :chatId', { chatId: chat.id })
              .orderBy('message.timestamp', 'ASC');

          if (lastSummary && lastSummary.lastMessage) {
              // Summarize messages from the last summary's lastMessage + 1 up to now
              queryBuilder = queryBuilder.andWhere('message.id > :lastSummaryMessageId', {
                  lastSummaryMessageId: lastSummary.lastMessage.id,
              });
          } else {
              // If no previous summary, summarize up to 1000 messages
              queryBuilder = queryBuilder
                .orderBy('message.timestamp', 'DESC') // Order by timestamp to get the most recent messages
                .take(1000); // Limit to 1000 messages for initial summarization
          }

          let messagesToSummarize: Message[] = await queryBuilder.getMany();

          if (messagesToSummarize.length === 0) {
              appLogger.warn(`Nenhuma mensagem encontrada para resumir no chat ${chat.waChatId}.`);
              return;
          }

          // 2. Prepare messages for LLM
          const formattedMessages = messagesToSummarize.map(msg => ({
              author: {
                name: msg.author.pushName,
                id: msg.author.id
              },
              body: msg.body,
              timestamp: msg.timestamp.toISOString(),
            }))
          .filter(msg => msg.body.trim() !== ""); // Filter out empty messages

          // 3. Call the LLM for summarization
          const response = await this.llmService.generateChatHistorySummary(
            chat,
            formattedMessages,
            lastSummary ? { summary: lastSummary.summary, timestamp: lastSummary.createdAt.toISOString() } : undefined
          );

          if (!response || !response.summary) {
              appLogger.warn(`Resumo não gerado para o chat ${chat.waChatId}.`);
              return;
          }

          // 4. Save the new ChatSummary entity
          const newSummary = this.chatSummaryRepository.create({
              chat: chat,
              lastMessage: lastMessage,
              summary: response.summary
          });

          await this.chatSummaryRepository.save(newSummary);
          appLogger.info(`Resumo salvo para o chat ${chat.waChatId}`);

      } catch (error) {
          appLogger.error({ error }, `Erro ao gerar ou salvar resumo para o chat ${chat.waChatId}.`);
      }
  }
}
