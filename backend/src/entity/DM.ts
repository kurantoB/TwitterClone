import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"
import { DMSession } from "./DMSession"

@Entity()
export class DM {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @ManyToOne(() => DMSession, { onDelete: 'CASCADE' })
    dmSession: DMSession

    @ManyToOne(() => User, {
        nullable: true,
        onDelete: 'SET NULL'
    })
    sender: User

    @Column({ type: 'text' })
    message: string

    @Column({ default: false })
    isSeen: boolean

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date
}