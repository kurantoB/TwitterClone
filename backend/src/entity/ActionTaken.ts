import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class ActionTaken {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @ManyToOne(
        () => User,
        {
            onDelete: "CASCADE",
            eager: true
        }
    )
    @Index()
    targetUser: User

    @CreateDateColumn({ type: "timestamptz" })
    @Index()
    actionTime: Date

    @Column({ type: "timestamptz" })
    @Index()
    expiryDate: Date
}