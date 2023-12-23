import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm"
import { User } from "./User"
import { Post } from "./Post"

@Entity()
export class PostReport {
    @PrimaryGeneratedColumn("uuid")
    id: string

    @OneToOne(
        () => Post,
        {
            onDelete: "CASCADE",
            eager: true
        }
    )
    @JoinColumn()
    post: Post

    @ManyToOne(
        () => User,
        {
            onDelete: "CASCADE",
            eager: true
        }
    )
    @Index()
    reporter: User

    @ManyToOne(
        () => User,
        {
            onDelete: "CASCADE",
            eager: true
        }
    )
    @Index()
    reportee: User

    @CreateDateColumn({ type: "timestamptz" })
    @Index()
    reportTime: Date

    @Column({ type: "timestamptz" })
    @Index()
    expiryDate: Date
}