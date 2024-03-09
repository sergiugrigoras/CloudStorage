import { NoteService } from '../../services/note.service';
import { NoteModel } from '../../interfaces/note.interface';
import { Component,  OnInit, TemplateRef, ViewChild } from '@angular/core';
import {switchMap, tap} from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import {MatSnackBar} from "@angular/material/snack-bar";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {EMPTY} from "rxjs";

const SNACKBAR_OPTIONS = { duration: 3000 };
@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements OnInit {
  notes: NoteModel[];
  noteControl = new FormGroup({
    title: new FormControl(null, Validators.required),
    body: new FormControl(null),
  });

  @ViewChild('noteDialog', { static: true }) noteDialog: TemplateRef<any>;
  @ViewChild('deleteConfirmDialog', { static: true }) deleteConfirmDialog: TemplateRef<any>;
  constructor(
    private noteService: NoteService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,) { }

  ngOnInit(): void {
    this.noteService.getAll().pipe(
      tap((notes) => {
        this.notes = notes ?? [];
      })
    ).subscribe();
  }

  private resetNoteControl() {
    this.noteControl.reset({
      title: null,
      body: null
    });
  }

  private get noteControlBody(): string | ListItem[] {
    return this.noteControl.get('body')?.value;
  }

  private set noteControlBody(value: string | ListItem[]) {
    const control = this.noteControl.get('body');
    if (control) {
      control.setValue(value);
    }
  }

  private parseNoteControlBody() {
    if (typeof this.noteControlBody === 'string') {
      return this.noteControlBody;
    } else if (Array.isArray(this.noteControlBody)) {
      return JSON.stringify(this.noteControlBody);
    } else {
      return null;
    }
  }

  getListItems() {
    if (Array.isArray(this.noteControlBody)) {
      return this.noteControlBody;
    }
    return undefined;
  }

  createNote(button: MatButton, type: 'text' | 'list') {
    this.resetNoteControl();
    const element = button._elementRef.nativeElement;
    if (element instanceof HTMLButtonElement) {
      const rectangle = element.getBoundingClientRect();
      const top = rectangle.bottom + 5;
      const left = rectangle.left;
      this._dialog.open(this.noteDialog, {
        disableClose: true,
        hasBackdrop: true,
        width: '500px',
        position: {
          top: top +'px',
          left: left + 'px'
        },
        data: type
      }).afterClosed().pipe(
        switchMap(dialogResult => {
          if (dialogResult) {

            return this.noteService.add({
              title: this.noteControl.get('title')?.value,
              body: this.parseNoteControlBody(),
              type: type
            });
          }
          return EMPTY;
        })
      ).subscribe({
        next: result => {
          this.notes.unshift(result);
        },
        error: () => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
        },
      });
    }
  }


  deleteNote(note: NoteModel) {
    if (note == null) return;
    this._dialog.open(this.deleteConfirmDialog, {
      disableClose: false,
      hasBackdrop: true,
      width: '400px',
      data: note.title
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          return this.noteService.delete(note.id);
        }
        return EMPTY;
      })
    ).subscribe({
      next: () => {
        const index = this.notes.findIndex(x => x.id === note.id);
        if (index >= 0) {
          this.notes.splice(index, 1);
        }
      },
      error: () => {
        this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      }
    })
  }

  editNote(note: NoteModel) {
    this.noteControl.get('title')?.setValue(note.title);
    this.noteControlBody = note.type === 'text' ? note.body : this.getNoteListItems(note.body);

    this._dialog.open(this.noteDialog, {
      disableClose: true,
      hasBackdrop: true,
      width: '500px',
      data: note.type
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          return this.noteService.update({
            title: this.noteControl.get('title')?.value,
            body: this.parseNoteControlBody(),
            type: note.type,
            id: note.id
          });
        }
        return EMPTY;
      })
    ).subscribe({
      next: result => {
        const index = this.notes.findIndex(x => x.id === note.id);
        if (index >= 0) {
          this.notes[index] = result;
        }
      },
      error: () => {
        this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      }
    });
  }

  addListItem(input: HTMLInputElement) {
    if (input.value == null || input.value.trim() === '') return;
    const item: ListItem = {label: input.value, checked: false};
    if (Array.isArray(this.noteControlBody)) {
      const newList = this.noteControlBody.slice();
      newList.unshift(item);
      this.noteControlBody = newList;
    } else {
      this.noteControlBody = [item];
    }
    input.value = '';
  }

  getNoteListItems(body: string): ListItem[] {
    try {
      return JSON.parse(body);
    }
    catch (e) {
      return null;
    }
  }
}

export interface ListItem {
  label: string;
  checked: boolean;
}
