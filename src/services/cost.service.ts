import { AppDataSource } from "./database";
import { ChatCost } from "../entities/ChatCost";
import { Chat } from "../entities/Chat";
import { Repository } from "typeorm";
import { appLogger } from "../utils/logger";
import {AI_MODELS, LlmUsageResponseWithOpenRouterFields} from "./llm.service";

export class CostService {
    private chatCostRepository: Repository<ChatCost>;
    private chatRepository: Repository<Chat>;

    constructor() {
        this.chatCostRepository = AppDataSource.getRepository(ChatCost);
        this.chatRepository = AppDataSource.getRepository(Chat);
    }

    public async recordLlmChatUsage(
        chatId: Chat | number,
        operation: string,
        usage?: LlmUsageResponseWithOpenRouterFields,
        modelName: string = AI_MODELS.DEFAULT
    ): Promise<void> {
        if(!usage) {
            appLogger.warn(`Usage data is missing for chat ID ${chatId}. Skipping cost recording.`);
            return;
        }

        try {
            const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

            let chat: Chat | null;

            if( typeof chatId === 'number') {
                chat = await this.chatRepository.findOneBy({id: chatId});
            } else {
                chat = chatId;
            }

            if (!chat) {
                appLogger.error(`Chat with ID ${chatId} not found for cost recording.`);
                return;
            }

            const inputTokens = usage.prompt_tokens || 0;
            const outputTokens = usage.completion_tokens || 0;
            const cost = usage.cost || 0; // Cost is available in the usage object if the provider is OpenRouter

            let chatCost = await this.chatCostRepository.findOne({
                where: {
                    chat: { id: chat.id },
                    date: today,
                    modelName: modelName,
                    operation: operation,
                },
            });

            if (chatCost) {
                // Update existing entry
                chatCost.inputTokens += inputTokens;
                chatCost.outputTokens += outputTokens;
                chatCost.cost += cost;
            } else {
                // Create new entry
                chatCost = this.chatCostRepository.create({
                    chat: chat,
                    date: today,
                    modelName: modelName,
                    operation: operation,
                    inputTokens: inputTokens,
                    outputTokens: outputTokens,
                    cost: cost,
                });
            }

            await this.chatCostRepository.save(chatCost);
            appLogger.debug({ chatId, modelName, operation }, `Custo de LLM registrado`);
        } catch (error) {
            appLogger.error({ error }, `Erro ao registrar custo de LLM para o chat ${chatId}.`);
        }
    }
}
