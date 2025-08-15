import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany } from "typeorm";
import { Message } from "./Message";
import { Contact } from "./Contact";
import { ChatSummary } from "./ChatSummary"; // Updated import

@Entity({ name: "chats" })
export class Chat {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, unique: true })
    waChatId!: string;

    @Column({ type: "varchar", nullable: true })
    name?: string | null;

    @Column({ type: "int", default: 0 }) // Added messageCount
    messageCount!: number; // Added messageCount

    @OneToMany(() => Message, message => message.chat)
    messages!: Message[];

    @ManyToMany(() => Contact, contact => contact.chats)
    participants!: Contact[];

    @OneToMany(() => ChatSummary, chatSummary => chatSummary.chat) // Updated relationship
    checkpoints!: ChatSummary[]; // Updated relationship

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
