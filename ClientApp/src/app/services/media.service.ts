import { HttpClient, HttpEvent, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MediaObject } from '../model/media-object.model';
import {Observable, map} from 'rxjs';
import { MediaAlbum } from '../model/media-album.model';

const API_URL: string = environment.baseUrl;
const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}
@Injectable({
  providedIn: 'root'
})
export class MediaService {
  constructor(private http: HttpClient, private router: Router) { }

  getMediaFile(id: string) {
    return this.http.get(API_URL + `/api/media/${id}`, { responseType: 'blob', observe: 'response' });
  }

  getSnapshotFile(id: string) {
    return this.http.get(API_URL + `/api/media/snapshot/${id}`, { responseType: 'blob', observe: 'response' });
  }

  parseFolder() {
    return this.http.post(API_URL + `/api/media/parse`, null);
  }

  getAllMediaFiles(favorites: boolean = false) {
    return this.http.get<MediaObject[]>(API_URL + `/api/media/all?favorites=${favorites}`);
  }

  addContentAccessKeyCookie() {
    return this.http.get(API_URL + `/api/media/access-key`);
  }

  removeContentAccesKey() {
    return this.http.delete(API_URL + `/api/media/access-key`);
  }

  toggleFavorite(id: string) {
    return this.http.post<boolean>(API_URL + `/api/media/favorite`, { id });
  }

  upload(formData: FormData): Observable<HttpEvent<Object>> {
    return this.http.post(API_URL + '/api/media/upload', formData,
      {
        observe: 'events',
        reportProgress: true
      });
  }

  createAlbum(name: string) {
    return this.http.post<string>(API_URL + '/api/media/new-album', { name })
  }

  getAllAlbums() {
    return this.http.get<MediaAlbum[]>(API_URL + '/api/media/all-albums').pipe(
      map((albums: MediaAlbum[]) => albums.map(x => new MediaAlbum(x)))
    );
  }

  addToAlbum(payload: unknown) {
    return this.http.post(API_URL + '/api/media/album-add', payload)
  }

  albumUniqueName(name: string) {
    return this.http.get(API_URL + `/api/media/unique-album-name?name=${name}`);
  }

}
