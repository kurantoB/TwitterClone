import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from "typeorm"
import { User } from "./User"
import consts from "../consts"

@Entity()
export class DM {
    @PrimaryColumn({
        length: 77 // uuid/uuid:xxx
    })
    id: string

    @Column("int")
    ordering: number

    @ManyToOne(
        () => User, 
        {
            nullable: true,
            onDelete: "SET NULL"
        }
    )
    @Index()
    sender: User

    @ManyToOne(
        () => User,
        {
            nullable: true,
            onDelete: "SET NULL"
        }
    )
    @Index()
    recipient: User

    @Column(
        "varchar",
        { length: consts.MAX_DM_LENGTH }
    )
    message: string

    @Column({
        default: false
    })
    isSeen: boolean

    @Column({
        default: false
    })
    isDeleted: boolean

    @CreateDateColumn({ type: "timestamptz" })
    createTime: Date
}