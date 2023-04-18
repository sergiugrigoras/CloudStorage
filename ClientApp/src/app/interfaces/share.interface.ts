import { FsoModel } from "./fso.interface";

export interface ShareModel {
    id: number,
    publicId?: string,
    userId?: string,
    shareDate?: Date,
    content?: FsoModel[]
}