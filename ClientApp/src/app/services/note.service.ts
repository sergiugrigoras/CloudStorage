import { NoteData, NoteModel } from '../model/note.model';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map } from 'rxjs';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';

@Injectable({
  providedIn: 'root',
})
export class NoteService {
  private readonly http = inject(HttpClient);
  constructor() {}
  private readonly _url = buildUrl(API_ENDPOINTS.NOTE.BASE);
  private readonly _noteSort = (firstNote: NoteModel, secondNote: NoteModel) => {
    const firstDate = firstNote.creationDate?.getTime() ?? 0;
    const secondDate = secondNote.creationDate?.getTime() ?? 0;
    return secondDate - firstDate;
  };
  getAll() {
    return this.http
      .get<NoteData[]>(this._url)
      .pipe(map((notes) => notes.map((x) => new NoteModel(x)).sort(this._noteSort)));
  }

  add(note: NoteModel) {
    return this.http
      .post<NoteData>(this._url, note, HTTP_OPTIONS_CONTENT_JSON)
      .pipe(map((x) => new NoteModel(x)));
  }

  update(note: NoteModel) {
    return this.http
      .put<NoteData>(this._url, note, HTTP_OPTIONS_CONTENT_JSON)
      .pipe(map((x) => new NoteModel(x)));
  }

  delete(id: string) {
    const url = buildUrl(API_ENDPOINTS.NOTE.BASE, id);
    return this.http.delete<unknown>(url);
  }
}
