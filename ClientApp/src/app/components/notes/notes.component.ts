import { NoteService } from '../../services/note.service';
import {NoteListItem, NoteModel} from '../../model/note.model';
import {Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {delay, switchMap, take, tap} from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import {MatSnackBar} from "@angular/material/snack-bar";
import {FormArray, FormBuilder, FormGroup, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {EMPTY, of} from "rxjs";

const SNACKBAR_OPTIONS = { duration: 3000 };
@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements OnInit {
  notes: NoteModel[];
  noteForm: FormGroup;

  @ViewChild('noteDialog', { static: true }) noteDialog: TemplateRef<any>;
  @ViewChild('deleteConfirmDialog', { static: true }) deleteConfirmDialog: TemplateRef<any>;
  constructor(
    private noteService: NoteService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private fb:FormBuilder) { }

  ngOnInit(): void {
    this.noteService.getAll().pipe(
      tap((notes) => {
        this.notes = notes ?? [];
      })
    ).subscribe();
  }

  private createNoteForm(note: NoteModel) {
    this.noteForm = this.fb.group({
      type: [note.type, Validators.required],
      title: [note.title, Validators.required],
      text: note.type === 'text' ? note.body : null,
      list: note.type === 'list' ? this.fb.array(note.getListItems().map(this.listItemToGroup.bind(this))) : null
    });
  }

  private listItemToGroup(item: NoteListItem) {
    return this.fb.group({
      label: item.label,
      checked: item.checked
    });
  }

  private createEmptyNoteForm(type: string) {
    this.noteForm = this.fb.group({
      type: [type, Validators.required],
      title: [null, Validators.required],
      text: null,
      list: this.fb.array([])
    });
  }

  get noteList() {
    return this.noteForm.get('list') as FormArray<FormGroup>;
  }

  addListItem() {
    const itemFormGroup= this.fb.group({
      label: [''],
      checked: [false],
    })
    this.noteList.push(itemFormGroup);
    this.noteForm.patchValue({
      list: this.noteList.value
    });
    // focus new input element
    of(this.noteList.length).pipe(
      take(1),
      delay(50)
    ).subscribe(x => {
      const input = document.querySelector(`#list-item-${(x - 1)}`);
      if (input instanceof HTMLInputElement) {
        input.focus();
      }
    });
  }

  deleteListItem(itemIndex: number) {
    this.noteList.removeAt(itemIndex);
  }

  createNote(button: MatButton, type: 'text' | 'list') {
    this.createEmptyNoteForm(type);
    const element = button._elementRef.nativeElement;
    if (element instanceof HTMLElement) {
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
            return this.noteService.add(this.convertFormToNote());
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
    this.createNoteForm(note);
    this._dialog.open(this.noteDialog, {
      disableClose: true,
      hasBackdrop: true,
      width: '500px',
      data: note.type
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          note.updating = true;
          const noteUpdate = this.convertFormToNote();
          noteUpdate.id = note.id;
          return this.noteService.update(noteUpdate);
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

  private convertFormToNote(): NoteModel {
    const type = this.noteForm.get('type')?.value;
    const title = this.noteForm.get('title')?.value;
    const text = this.noteForm.get('text')?.value;
    const list = this.noteList.value;

    return  new NoteModel({
      type,
      title,
      body: type === 'text' ? text : JSON.stringify(list),
    });
  }
}
