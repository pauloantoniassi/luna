import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Chat } from "./Chat";
import { Message } from "./Message";

@Entity({ name: "chat_summaries" })
export class ChatSummary {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "text", length: 10000 })
    summary!: string;

    @ManyToOne(() => Chat, chat => chat.checkpoints, {
        onDelete: 'CASCADE',
        nullable: false
    })
    @JoinColumn({ name: 'chatId' })
    chat!: Chat;

    @ManyToOne(() => Message, message => message.checkpoint, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    @JoinColumn({ name: 'lastMessageId' })
    lastMessage!: Message;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
