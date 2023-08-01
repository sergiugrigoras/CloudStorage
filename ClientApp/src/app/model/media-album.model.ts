import { MediaObject } from "./media-object.model";

export class MediaAlbum {
    id: string;
    name: string;
    ownerId: string;
    createDate: Date;
    lastUpdate: Date;
    ownerName: string;
    mediaObjects: MediaObject[];

    constructor(mediaAlbum: any) {
        this.id = mediaAlbum.id;
        this.name = mediaAlbum.name;
        this.ownerId = mediaAlbum.ownerId;
        this.createDate = new Date(mediaAlbum.createDate);
        this.lastUpdate = new Date(mediaAlbum.lastUpdate);
        this.ownerName = mediaAlbum.ownerName;
        if (Array.isArray(mediaAlbum.mediaObjects)) {
            this.mediaObjects = mediaAlbum.mediaObjects.map((x: any) => new MediaObject(x));
        }
    }
}