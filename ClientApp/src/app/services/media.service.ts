import { HttpClient, HttpEvent, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {MediaObject, MediaObjectFilter} from '../model/media-object.model';
import {Observable, map, BehaviorSubject} from 'rxjs';
import { MediaAlbum } from '../model/media-album.model';
import {buildUrl} from "../core/url-builder";
import {API_ENDPOINTS} from "../core/api-endpoints";
import {HTTP_OPTIONS_CONTENT_JSON} from "../core/constants";



@Injectable({
  providedIn: 'root'
})
export class MediaService {
  private _selectMode = new BehaviorSubject<boolean>(false);
  selectMode$ = this._selectMode.asObservable();
  constructor(private http: HttpClient, private router: Router) { }

  enableSelectMode() {
    this._selectMode.next(true);
  }
  disableSelectMode() {
    this._selectMode.next(false);
  }
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

  upload(formData: FormData): Observable<HttpEvent<Object>> {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.UPLOAD);
    return this.http.post(url, formData,
      {
        observe: 'events',
        reportProgress: true
      });
  }

  createAlbum(name: string) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.NEW_ALBUM);
    return this.http.post<string>(url, { name }, HTTP_OPTIONS_CONTENT_JSON);
  }

  getAllAlbums() {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ALL_ALBUMS);
    return this.http.get<MediaAlbum[]>(url)
      .pipe(
        map(
          (albums: MediaAlbum[]) => albums.map(x => new MediaAlbum(x))
        )
      );
  }

  addToAlbum(payload: unknown) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ALBUM_ADD);
    return this.http.post(url, payload, HTTP_OPTIONS_CONTENT_JSON)
  }

  albumUniqueName(name: string) {
    const options = {
      params: new HttpParams().set('name', name)
    };
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.UNIQUE_ALBUM_NAME)
    return this.http.get(url, options);
  }

  getAlbumContent(name: string) {
    const options = {
      params: new HttpParams().set('name', name)
    };
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.ALBUM)
    return this.http.get<MediaObject[]>(url, options);
  }

  deleteMediaObjects(id: string[], permanent: boolean) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE);
    const options = {
      params: new HttpParams().set('permanent', permanent),
      body: {ids: id},
      headers: HTTP_OPTIONS_CONTENT_JSON.headers
    }
    return this.http.delete<any>(url, options);
  }

  restoreMediaObjects(id: string[]) {
    const url = buildUrl(API_ENDPOINTS.MEDIA.BASE, API_ENDPOINTS.MEDIA.RESTORE);
    const body = {ids: id};
    return this.http.post<string[]>(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

}
