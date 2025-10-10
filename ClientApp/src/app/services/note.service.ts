import { NoteModel } from '../model/note.model';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Injectable } from '@angular/core';
import {map} from "rxjs";
import {buildUrl} from "../core/url-builder";
import {API_ENDPOINTS} from "../core/api-endpoints";
import {HTTP_OPTIONS_CONTENT_JSON} from "../core/constants";


@Injectable({
  providedIn: 'root'
})
export class NoteService {

  constructor(private http: HttpClient) { }
  private readonly _url = buildUrl(API_ENDPOINTS.NOTE.BASE);
  private readonly _noteSort = (firstNote: NoteModel, secondNote: NoteModel) => {
    const firstDate = new Date(firstNote.creationDate).getTime();
    const secondDate = new Date(secondNote.creationDate).getTime();
    return secondDate - firstDate;
  };
  getAll() {
    return this.http.get<NoteModel[]>(this._url)
      .pipe(
        map(notes => notes
          .map(x => new NoteModel(x))
          .sort(this._noteSort)
        )
      );
  }

  add(note: NoteModel) {
    return this.http.post<NoteModel>(this._url, note, HTTP_OPTIONS_CONTENT_JSON)
      .pipe(
        map(x => new NoteModel(x))
      );
  }

  update(note: NoteModel) {
    return this.http.put<NoteModel>(this._url, note, HTTP_OPTIONS_CONTENT_JSON).pipe(
      map(x => new NoteModel(x))
    );
  }

  delete(id: number) {
    const options = {
      params: new HttpParams().set('id', id),
    }
    return this.http.delete<any>(this._url, options);
  }
}
