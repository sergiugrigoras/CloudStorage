import { SafeUrl } from "@angular/platform-browser";
import { AsyncSubject, BehaviorSubject } from "rxjs";

export class MediaObject {
    id: string;
    uploadFileName: string;
    contentType: string;
    hash: string;
    width: number;
    height: number;
    duration: number;
    favorite: boolean;
    ownerId: string;
    snapshot$: AsyncSubject<SafeUrl>;


    constructor(mediaObject: any) {
        this.id = mediaObject.id;
        this.uploadFileName = mediaObject.uploadFileName;
        this.contentType = mediaObject.contentType;
        this.hash = mediaObject.hash;
        this.width = mediaObject.width;
        this.height = mediaObject.height;
        this.duration = mediaObject.duration;
        this.favorite = mediaObject.favorite;
        this.ownerId = mediaObject.ownerId;
        this.snapshot$ = new AsyncSubject();
    }
}

export interface SnapshotUrl {
    url: string;
    safeUrl: SafeUrl;
}