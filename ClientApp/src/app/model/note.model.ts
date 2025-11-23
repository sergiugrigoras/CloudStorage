import { signal } from '@angular/core';

export class NoteModel {
  id: string | null;
  type: NoteType;
  title: string;
  text: string | null;
  checklist: ChecklistItem[] | null;
  creationDate: Date | null;
  modificationDate: Date | null;
  updating = signal(false);

  constructor(data: NoteData) {
    this.id = data.id ?? null;
    this.type = data.type;
    this.title = data.title;
    this.text = data.text ?? null;
    this.checklist = data.checklist ? data.checklist : null;
    this.creationDate = data.creationDate ? new Date(data.creationDate) : null;
    this.modificationDate = data.modificationDate ? new Date(data.modificationDate) : null;
  }

  public static fromTextFormValue(value: TextNoteFormValue) {
    return new NoteModel({
      type: NoteType.Text,
      title: value.title,
      text: value.text,
    });
  }

  public static fromListFormValue(value: ListNoteFormValue) {
    return new NoteModel({
      type: NoteType.List,
      title: value.title,
      checklist: [...value.list],
    });
  }
}

export interface ChecklistItem {
  label: string;
  checked: boolean;
}

export interface NoteData {
  id?: string;
  type: NoteType;
  title: string;
  text?: string;
  checklist?: ChecklistItem[];
  creationDate?: string;
  modificationDate?: string;
}

export enum NoteType {
  Text = 1,
  List = 2,
}

export type TextNoteFormValue = {
  title: string;
  text: string;
};

export type ListNoteFormValue = {
  title: string;
  list: ChecklistItem[];
};
