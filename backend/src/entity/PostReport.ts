import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./User";

@Entity()
export class PostReport {
    @PrimaryColumn({ type: 'varchar' })
    @Index()
    postId: string

    @PrimaryColumn({ type: 'varchar' })
    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
    )
    @Index()
    reporter: User

    @ManyToOne(
        () => User,
        { onDelete: "CASCADE" }
    )
    @Index()
    reportee: User

    @CreateDateColumn({ type: "timestamptz" })
    reportTime: Date

    @Column({ type: "timestamptz" })
    expiryDate: Date
}