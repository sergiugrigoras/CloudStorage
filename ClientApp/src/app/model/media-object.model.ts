import {SafeUrl} from "@angular/platform-browser";
import {AsyncSubject} from "rxjs";

export class MediaObject {
  id: string;
  uploadFileName: string;
  contentType: string;
  hash: string;
  width: number;
  height: number;
  duration: number;
  videoLength: string;
  favorite: boolean;
  ownerId: string;
  snapshot$: AsyncSubject<SafeUrl>;
  isLoading = true;
  isSelected = false;
  isVideo: boolean;

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
    this.videoLength = this.getVideoLength();
    this.isVideo = this.contentType.startsWith('video');
  }

  private getVideoLength() {
    const minutes = Math.floor(this.duration / 60000);
    const seconds = Math.floor((this.duration % 60000) / 1000);
    return (
      seconds == 60 ?
        (minutes + 1) + ":00" :
        minutes + ":" + (seconds < 10 ? "0" : "") + seconds
    );
  }
}
