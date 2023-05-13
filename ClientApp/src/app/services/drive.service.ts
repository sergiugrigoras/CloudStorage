import { DiskModel } from './../interfaces/disk.interface';
import { FsoModel } from './../interfaces/fso.interface';
import { environment } from './../../environments/environment';
import { HttpClient, HttpHeaders, HttpEvent, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { map, catchError, retry, tap } from 'rxjs/operators';
import { throwError, Observable, Subject } from 'rxjs';
import { ShareModel } from '../interfaces/share.interface';


const SHARE_URL = `${window.location.protocol}//${window.location.hostname}/files/`;
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
  constructor(private http: HttpClient, private router: Router) { }

  getUserRoot() {
    return this.http.get<FsoModel>(apiUrl + '/api/fso/root');
  }

  getFolder(id: number) {
    return this.http.get<FsoModel>(apiUrl + '/api/fso/folder/' + id);
  }

  openFolder(id: number) {
    this.openFolder$.next(id);
  }




  // Old endpoints

  getFso(id: any) {
    return this.http.get<FsoModel>(apiUrl + '/api/fso/' + id);
  }



  getFullPath(id: any) {
    return this.http.get<FsoModel[]>(apiUrl + '/api/fso/fullpath/' + id);
  }



  getUserDiskInfo() {
    return this.http.get<DiskModel>(apiUrl + '/api/fso/getuserdiskinfo');
  }

  getShareUrl(shareId: string) {
    return `${SHARE_URL}${shareId}`
  }
  addFolder(newFso: any) {
    return this.http.post<FsoModel>(apiUrl + '/api/fso/addfolder', newFso, httpOptions);
  }

  delete(list: string[]) {
    let csv = list.join(',');
    return this.http.delete(apiUrl + '/api/fso/delete', {
      headers: { 'Content-Type': 'application/json' }, params: { fsoIdcsv: csv }
    }).pipe(retry(3), map(data => {
      return data;
    }));
  }

  move(list: string[], destination: number) {
    let csv = list.join(',');
    let params = new HttpParams()
      .set('fsoIdcsv', csv)
      .set('destinationDirId', String(destination));

    return this.http.post(apiUrl + '/api/fso/move', null, {
      headers: { 'Content-Type': 'application/json' }, params
    });
  }
  rename(fso: FsoModel) {
    return this.http.put(apiUrl + '/api/fso/rename', fso, httpOptions);
  }

  upload(formData: FormData): Observable<HttpEvent<Object>> {
    return this.http.post(apiUrl + '/api/fso/upload', formData,
      {
        observe: 'events',
        reportProgress: true
      });
  }
  download(list: string[]): Observable<HttpEvent<Object>> {
    let csv = list.join(',');
    let formData = new FormData();
    formData.append('fsoIdcsv', csv);
    return this.http.post<Blob>(apiUrl + '/api/fso/download', formData, {
      observe: 'events',
      reportProgress: true,
      responseType: 'blob' as 'json',
    });
  }



  share(list: string[]) {
    let csv = list.join(',');
    let formData = new FormData();
    formData.append('fsoIdcsv', csv);
    return this.http.post(apiUrl + '/api/share/add', formData, {
      responseType: 'text'
    });
  }

  getShareContent(shareId: string) {
    return this.http.get<FsoModel[]>(apiUrl + '/api/share/get/' + shareId);
  }

  getShareInfo(shareId: string) {
    return this.http.get(apiUrl + '/api/share/getinfo/' + shareId);
  }

  deleteShare(shareId: string) {
    return this.http.delete(apiUrl + '/api/share/delete/' + shareId, httpOptions);
  }

  sendShareEmail(id: string, email: string, url: string) {
    return this.http.post(apiUrl + '/api/share/sendemail', undefined, {
      headers: { 'Content-Type': 'application/json' }, params: { id, email, url }
    });
  }

  downloadShare(shareId: string) {
    return this.http.get<Blob>(apiUrl + '/api/share/download/' + shareId, {
      observe: 'events',
      reportProgress: true,
      responseType: 'blob' as 'json',
    });
  }

  getAllUsersShares() {
    return this.http.get<ShareModel[]>(apiUrl + '/api/share/getall');
  }
}
