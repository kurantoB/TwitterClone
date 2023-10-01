import formidable, { Fields, Files } from "formidable"

export {}

declare global {
    namespace Formidable {
        export interface AccountFields extends Fields {
            username: string[],
            bio: string[],
            isDeleteAvatar?: string[]
        }

        export interface AccountFiles extends Files {
            avatar?: formidable.File[]
        }
    }
}