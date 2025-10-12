import { DiskInfoModel } from '../interfaces/disk.interface';
import { FsoModel, FsoMoveResultModel } from '../model/fso.model';
import { HttpClient, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  openFolder$ = new Subject<number>();
  clipboard$ = new BehaviorSubject<number[]>([]);
  constructor(private http: HttpClient) {}

  getUserRoot() {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.ROOT);
    return this.http.get<FsoModel>(url);
  }

  getFolder(id: number) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.FOLDER, `${id}`);
    return this.http.get<FsoModel>(url);
  }

  getFullPath(id: any) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.FULL_PATH, `${id}`);
    return this.http.get<FsoModel[]>(url);
  }

  validateEmail(input: string) {
    const regularExpression =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regularExpression.test(input?.toLowerCase());
  }

  getDiskInfo() {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.DRIVE_INFO);
    return this.http.get<DiskInfoModel>(url);
  }

  addFolder(newFso: any) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.ADD_FOLDER);
    return this.http.post<FsoModel>(url, newFso, HTTP_OPTIONS_CONTENT_JSON);
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

  rename(fso: any) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.RENAME);
    return this.http.put(url, fso, HTTP_OPTIONS_CONTENT_JSON);
  }

  upload(formData: FormData) {
    const url = buildUrl(API_ENDPOINTS.FSO.BASE, API_ENDPOINTS.FSO.UPLOAD);
    return this.http.post(url, formData, {
      observe: 'events',
      reportProgress: true,
    });
  }

  download(list: number[]): Observable<HttpEvent<Object>> {
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
