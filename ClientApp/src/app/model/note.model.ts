export class NoteModel {
  id: number;
  type: string;
  title: string;
  body: string;
  creationDate: Date;
  modificationDate: Date;
  color: string;
  updating = false;

  constructor(note: any) {
    this.id = note.id;
    this.title = note.title;
    this.body = note.body;
    this.creationDate = note.creationDate ? new Date(note.creationDate) : null;
    this.modificationDate = note.modificationDate ? new Date(note.modificationDate) : null;
    this.color = note.color;
    this.type = note.type;
  }

  getListItems(): NoteListItem[] | null {
    try {
      return JSON.parse(this.body);
    }
    catch (e) {
      return null;
    }
  }

}

export interface NoteListItem {
  label: string;
  checked: boolean;
}
