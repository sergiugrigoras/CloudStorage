import { NoteModel } from './../interfaces/note.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from './../../environments/environment';

const apiUrl: string = environment.apiUrl;
const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}

@Injectable({
  providedIn: 'root'
})
export class NoteService {

  constructor(private http: HttpClient) { }

  get(id: number, key: string) {
    return this.http.post<NoteModel>(apiUrl + '/api/note/' + id, { key }, httpOptions);
  }

  getAll() {
    return this.http.get<NoteModel[]>(apiUrl + '/api/note/getall');
  }

  add(note: NoteModel) {
    return this.http.post<NoteModel>(apiUrl + '/api/note/add', note, httpOptions);
  }

  update(note: NoteModel) {
    return this.http.put<NoteModel>(apiUrl + '/api/note/update', note, httpOptions);
  }

  delete(id: number) {
    return this.http.delete<any>(apiUrl + '/api/note/delete/' + id);
  }

  share(id: number) {
    return this.http.post(apiUrl + '/api/note/share', { id }, httpOptions);
  }
}
