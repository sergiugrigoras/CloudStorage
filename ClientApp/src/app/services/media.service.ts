import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { MediaObject } from '../model/media-object.model';

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
    return this.http.get(API_URL + `/api/media/${id}`, { responseType: 'blob' as 'json', observe: 'response' });
  }

  getSnapshotFile(id: string) {
    return this.http.get(API_URL + `/api/media/snapshot/${id}`, { responseType: 'blob' as 'json', observe: 'response' });
  }

  parseFolder() {
    return this.http.post(API_URL + `/api/media/parse`, null);
  }

  getAllMediaFiles() {
    return this.http.get<MediaObject[]>(API_URL + `/api/media/all`);
  }




}
