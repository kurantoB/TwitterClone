// to make the file a module and avoid the TypeScript error
export {}

declare global {
    namespace Express {
        export interface User {
            id?: string,
            displayName: string
        }

        export interface Request {
            user?: User
        }
    }
}