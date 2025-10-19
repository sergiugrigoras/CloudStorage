export class NoteModel {
  id = 0;
  type = '';
  title = '';
  body = '';
  creationDate: Date | null = null;
  modificationDate: Date | null = null;
  color = '';
  updating = false;

  constructor(note: NoteData) {
    this.id = note.id ?? 0;
    this.type = note.type;
    this.title = note.title;
    this.body = note.body;
    this.creationDate = note.creationDate ? new Date(note.creationDate) : null;
    this.modificationDate = note.modificationDate ? new Date(note.modificationDate) : null;
    this.color = note.color ?? '';
  }

  getListItems(): NoteListItem[] | null {
    try {
      return JSON.parse(this.body);
    } catch {
      return null;
    }
  }
}

export interface NoteListItem {
  label: string;
  checked: boolean;
}

export interface NoteData {
  id?: number;
  type: string;
  title: string;
  body: string;
  creationDate?: string | Date | null;
  modificationDate?: string | Date | null;
  color?: string;
}
