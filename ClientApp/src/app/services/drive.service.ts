import { DiskInfoModel } from '../interfaces/disk.interface';
import { FsoModel, FsoMoveResultModel } from '../model/fso.model';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  openFolder$ = new Subject<number>();
  clipboard$ = new BehaviorSubject<number[]>([]);
  private readonly http = inject(HttpClient);
  constructor() {}

  getUserRoot() {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.ROOT);
    return this.http.get<FsoModel>(url);
  }

  getFolder(id: number) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.FOLDER, `${id}`);
    return this.http.get<FsoModel>(url);
  }

  getFullPath(id: number) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.FULL_PATH, `${id}`);
    return this.http.get<FsoModel[]>(url);
  }

  getDiskInfo() {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.DRIVE_INFO);
    return this.http.get<DiskInfoModel>(url);
  }

  addFolder(name: string, parentId: number) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.ADD_FOLDER);
    const body = { name, parentId, isFolder: true };
    return this.http.post<FsoModel>(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

  delete(ids: number[]) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.DELETE);
    const options = {
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
      body: ids,
    };
    return this.http.delete(url, options);
  }

  move(list: number[], destination: number) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.MOVE);
    const options = {
      params: new HttpParams().set('destinationId', destination),
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
    };
    return this.http.post<FsoMoveResultModel>(url, list, options);
  }

  rename(id: number, name: string) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.RENAME);
    return this.http.put(url, { id, name }, HTTP_OPTIONS_CONTENT_JSON);
  }

  upload(formData: FormData) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.UPLOAD);
    return this.http.post(url, formData, {
      observe: 'events',
      reportProgress: true,
    });
  }

  download(list: number[]) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.DOWNLOAD);

    return this.http.post<Blob>(url, list, {
      observe: 'events',
      reportProgress: true,
      responseType: 'blob' as 'json',
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
    });
  }

  uniqueName(name: string, parentId: number, isFolder: boolean) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.UNIQUE);
    const options = {
      params: new HttpParams()
        .set('parentId', parentId)
        .set('name', name)
        .set('isFolder', isFolder),
    };
    return this.http.get<boolean>(url, options);
  }
}
