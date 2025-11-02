import { SafeValue } from '@angular/platform-browser';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { signal, WritableSignal } from '@angular/core';

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
  snapshot: WritableSignal<SafeValue | null> = signal(null);
  snapshotObjectUrl: string | null = null;
  isSelected = signal(false);
  isVideo: boolean;
  markedForDeletion: boolean;
  contentSourceUrl: string;
  contentSafeValue: SafeValue | null = null;
  contentObjectUrl: string | null = null;

  constructor(mediaObject: MediaObject) {
    this.id = mediaObject.id;
    this.uploadFileName = mediaObject.uploadFileName;
    this.contentType = mediaObject.contentType;
    this.hash = mediaObject.hash;
    this.width = mediaObject.width;
    this.height = mediaObject.height;
    this.duration = mediaObject.duration;
    this.favorite = mediaObject.favorite;
    this.ownerId = mediaObject.ownerId;
    this.videoLength = this.getVideoLength();
    this.isVideo = this.contentType.startsWith('video');
    this.markedForDeletion = mediaObject.markedForDeletion;
    this.contentSourceUrl = buildUrl(API_ENDPOINTS.CONTENT.BASE, this.id);
  }

  private getVideoLength() {
    const minutes = Math.floor(this.duration / 60000);
    const seconds = Math.floor((this.duration % 60000) / 1000);
    return seconds == 60
      ? minutes + 1 + ':00'
      : minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  public toggleSelected() {
    this.isSelected.update((value) => !value);
  }
}

export interface MediaObjectFilter {
  favorite?: boolean;
  deleted?: boolean;
  ids?: string[];
}
