import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { MediaObject, MediaObjectFilter } from '../model/media-object.model';
import { Observable, map } from 'rxjs';
import { MediaAlbum } from '../model/media-album.model';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';
import { IStorageInfo } from '../interfaces/disk.interface';

@Injectable({
  providedIn: 'root',
})
export class MediaService {
  private readonly http = inject(HttpClient);
  public readonly selectMode = signal(false);
  constructor() {}

  getMediaFile(id: string) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, id);
    return this.http.get(url, { observe: 'response', responseType: 'blob' });
  }

  getSnapshotFile(id: string) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.SNAPSHOT, id);
    return this.http.get(url, { responseType: 'blob', observe: 'response' });
  }

  getMediaFiles(filter: MediaObjectFilter) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.SEARCH);
    return this.http.post<MediaObject[]>(url, filter, HTTP_OPTIONS_CONTENT_JSON);
  }

  addContentAccessKeyCookie() {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ACCESS_KEY);
    return this.http.get(url);
  }

  removeContentAccessKey() {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ACCESS_KEY);
    return this.http.delete(url);
  }

  toggleFavorite(id: string) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.FAVORITE);
    return this.http.post<boolean>(url, { id }, HTTP_OPTIONS_CONTENT_JSON);
  }

  upload(formData: FormData): Observable<HttpEvent<MediaObject[]>> {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.UPLOAD);
    return this.http.post<MediaObject[]>(url, formData, {
      observe: 'events',
      reportProgress: true,
    });
  }

  createAlbum(name: string) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.NEW_ALBUM);
    return this.http.post<string>(url, { name }, HTTP_OPTIONS_CONTENT_JSON);
  }

  getAllAlbums() {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ALL_ALBUMS);
    return this.http
      .get<MediaAlbum[]>(url)
      .pipe(map((albums: MediaAlbum[]) => albums.map((x) => new MediaAlbum(x))));
  }

  addToAlbum(payload: unknown) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ALBUM_ADD);
    return this.http.post(url, payload, HTTP_OPTIONS_CONTENT_JSON);
  }

  albumUniqueName(name: string) {
    const options = {
      params: new HttpParams().set('name', name),
    };
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.UNIQUE_ALBUM_NAME);
    return this.http.get(url, options);
  }

  getAlbumContent(name: string) {
    const options = {
      params: new HttpParams().set('name', name),
    };
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ALBUM);
    return this.http.get<MediaObject[]>(url, options);
  }

  deleteMediaObjects(id: string[], permanent: boolean) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE);
    const options = {
      params: new HttpParams().set('permanent', permanent),
      body: { ids: id },
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
    };
    return this.http.delete<string[]>(url, options);
  }

  restoreMediaObjects(id: string[]) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.RESTORE);
    const body = { ids: id };
    return this.http.post<string[]>(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

  getStorageInfo() {
    const url = buildUrl(API_ENDPOINTS.STORAGE.BASE, API_ENDPOINTS.STORAGE.INFO);
    return this.http.get<IStorageInfo>(url);
  }
}
