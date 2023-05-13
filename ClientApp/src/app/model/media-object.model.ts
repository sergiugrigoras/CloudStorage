import { SafeUrl } from "@angular/platform-browser";

export class MediaObject {
    id: string;
    uploadFileName: string;
    contentType: string;
    hash: string;
    snapshot: string;
    favorite: boolean;
    ownerId: string;
    snapshotUrl: SafeUrl;
    fileUrl: SafeUrl;


    constructor(mediaObject: any) {
        this.id = mediaObject.id;
        this.uploadFileName = mediaObject.uploadFileName;
        this.contentType = mediaObject.contentType;
        this.hash = mediaObject.hash;
        this.snapshot = mediaObject.snapshot;
        this.favorite = mediaObject.favorite;
        this.ownerId = mediaObject.ownerId;
    }
}