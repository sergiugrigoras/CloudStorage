export interface NoteModel {
    id?: number,
    title: string,
    body: string,
    creationDate?: Date,
    modificationDate?: Date,
    color?: string,
    type: string
}