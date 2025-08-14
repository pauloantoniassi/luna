import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToMany } from "typeorm";
import { Message } from "./Message";
import { Contact } from "./Contact";

@Entity({ name: "chats" })
export class Chat {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 50, unique: true })
    waChatId!: string;

    @Column({ type: "varchar", nullable: true })
    name?: string | null;

    @OneToMany(() => Message, message => message.chat)
    messages!: Message[];

    @ManyToMany(() => Contact, contact => contact.chats)
    participants!: Contact[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
