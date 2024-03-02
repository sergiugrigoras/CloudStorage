import { DiskInfoModel } from '../interfaces/disk.interface';
import {FsoModel, FsoMoveResultModel} from '../model/fso.model';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {Observable, Subject, BehaviorSubject} from 'rxjs';


const apiUrl: string = environment.baseUrl;
const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}
@Injectable({
  providedIn: 'root'
})
export class DriveService {

  openFolder$ = new Subject<number>();
  clipboard$ = new BehaviorSubject<number[]>([]);
  constructor(private http: HttpClient, private router: Router) { }

  getUserRoot() {
    return this.http.get<FsoModel>(apiUrl + '/api/fso/root');
  }

  getFolder(id: number) {
    return this.http.get<FsoModel>(apiUrl + '/api/fso/folder/' + id);
  }

  getFullPath(id: any) {
    return this.http.get<FsoModel[]>(apiUrl + '/api/fso/full-path/' + id);
  }

  validateEmail(input: string) {
    const regularExpression = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return regularExpression.test(input?.toLowerCase());
  }

  getDiskInfo() {
    return this.http.get<DiskInfoModel>(apiUrl + '/api/fso/drive-info');
  }

  addFolder(newFso: any) {
    return this.http.post<FsoModel>(apiUrl + '/api/fso/add-folder', newFso, httpOptions);
  }

  delete(ids: number[]) {
    return this.http.delete(apiUrl + '/api/fso/delete', {
      headers: { 'Content-Type': 'application/json' }, body: ids
    });
  }

  move(list: number[], destination: number) {
    let params = new HttpParams()
      .set('destinationId', destination);

    return this.http.post<FsoMoveResultModel>(apiUrl + '/api/fso/move', list, {
      headers: { 'Content-Type': 'application/json' }, params
    });
  }

  rename(fso: any) {
    return this.http.put(apiUrl + '/api/fso/rename', fso, httpOptions);
  }

  upload(formData: FormData) {
    return this.http.post(apiUrl + '/api/fso/upload', formData,
      {
        observe: 'events',
        reportProgress: true
      });
  }

  download(list: number[]): Observable<HttpEvent<Object>> {
    return this.http.post<Blob>(apiUrl + '/api/fso/download', list, {
      observe: 'events',
      reportProgress: true,
      responseType: 'blob' as 'json',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  uniqueName(name: string, parentId: number, isFolder: boolean) {
    let params = new HttpParams();
    params = params
      .set('parentId', parentId)
      .set('name', name)
      .set('isFolder', isFolder)
    return this.http.get<boolean>(apiUrl + '/api/fso/unique', {params: params, headers: { 'Content-Type': 'application/json' } });
  }
}
