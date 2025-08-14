import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Chat } from "./Chat";
import { Contact } from "./Contact";

@Entity({ name: "messages" })
export class Message {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", unique: true })
    waMessageId!: string;

    @Column({ type: "text" })
    body!: string;

    @Column({ type: "boolean" })
    fromMe!: boolean;

    @Column({ type: "datetime" })
    timestamp!: Date;

    @ManyToOne(() => Chat, chat => chat.messages, {
        onDelete: 'CASCADE',
        nullable: false
    })
    @JoinColumn({ name: 'chatId' })
    chat!: Chat;

    @ManyToOne(() => Contact, contact => contact.messages, {
        onDelete: 'RESTRICT',
        nullable: false
    })
    @JoinColumn({ name: 'authorId' })
    author!: Contact;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
