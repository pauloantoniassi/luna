import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany, JoinTable } from "typeorm";
import { Message } from "./Message";
import { Chat } from "./Chat";

@Entity({ name: "contacts" })
export class Contact {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, unique: true })
    waContactId!: string;

    @Column({ type: "varchar", nullable: true })
    pushName?: string | null;

    @OneToMany(() => Message, message => message.author)
    messages!: Message[];

    @ManyToMany(() => Chat, chat => chat.participants)
    @JoinTable({
        name: "chat_participants",
        joinColumn: { name: "contactId", referencedColumnName: "id" },
        inverseJoinColumn: { name: "chatId", referencedColumnName: "id" },
    })
    chats!: Chat[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
