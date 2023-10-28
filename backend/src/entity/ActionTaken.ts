import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class ActionTaken {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @Column({ type: 'varchar' })
    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
    )
    @Index()
    targetUser: User

    @CreateDateColumn({ type: "timestamptz" })
    actionTime: Date

    @Column({ type: "timestamptz" })
    expiryDate: Date
}