import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"

@Entity()
export class DMSession {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @ManyToOne(() => User, {
        nullable: true,
        onDelete: 'SET NULL'
    })
    participant1: User

    @ManyToOne(() => User, {
        nullable: true,
        onDelete: 'SET NULL'
    })
    participant2: User

    @Column({
        type: 'timestamptz',
        nullable: true
    })
    lastUpdate: Date
}