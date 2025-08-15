import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from "typeorm";
import { Chat } from "./Chat";

@Entity({ name: "chat_costs" })
@Unique(["chat", "date", "modelName", "operation"]) // More granular unique constraint
export class ChatCost {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Chat, chat => chat.chatCosts, {
        onDelete: 'CASCADE',
        nullable: false
    })
    @JoinColumn({ name: 'chatId' })
    chat!: Chat;

    @Column({ type: "date" }) // Stores date as YYYY-MM-DD
    date!: string;

    @Column({ type: "varchar", length: 75 }) // e.g., "gpt-4", "gemini-pro"
    modelName!: string;

    @Column({ type: "varchar", length: 50 }) // e.g., "summary", "response", "sentiment_analysis"
    operation!: string;

    @Column({ type: "int", default: 0 })
    inputTokens!: number;

    @Column({ type: "int", default: 0 })
    outputTokens!: number;

    @Column({ type: "bigint", default: 0, comment: '10 milhões = 0,01 USD' }) // Calculated cost for this specific entry, stored as scaled integer
    cost!: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
