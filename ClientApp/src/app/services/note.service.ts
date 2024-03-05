import { NoteModel } from '../interfaces/note.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import {map} from "rxjs";

const NOTES_SORT = (firstNote: NoteModel, secondNote: NoteModel) => {
  const firstDate = new Date(firstNote.creationDate).getTime();
  const secondDate = new Date(secondNote.creationDate).getTime();
  return secondDate - firstDate;
}
const apiUrl: string = environment.baseUrl;
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

  getAll() {
    return this.http.get<NoteModel[]>(apiUrl + '/api/note/all').pipe(map(notes => notes.sort(NOTES_SORT)));
  }

  add(note: NoteModel) {
    return this.http.post<NoteModel>(apiUrl + '/api/note', note, httpOptions);
  }

  update(note: NoteModel) {
    return this.http.put<NoteModel>(apiUrl + '/api/note', note, httpOptions);
  }

  delete(id: number) {
    return this.http.delete<any>(apiUrl + '/api/note/' + id);
  }
}
