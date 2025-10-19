import { NoteService } from '../../services/note.service';
import { NoteListItem, NoteModel } from '../../model/note.model';
import { Component, inject, OnInit, signal, TemplateRef, ViewChild } from '@angular/core';
import { delay, switchMap, take, tap } from 'rxjs/operators';
import {
  MatDialog,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButton, MatMiniFabButton, MatIconButton } from '@angular/material/button';
import { EMPTY, of } from 'rxjs';
import { TitleCasePipe, DatePipe } from '@angular/common';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import {
  MatCard,
  MatCardHeader,
  MatCardTitle,
  MatCardSubtitle,
  MatCardContent,
  MatCardActions,
  MatCardFooter,
} from '@angular/material/card';
import { MatDivider } from '@angular/material/list';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatCheckbox } from '@angular/material/checkbox';

const SNACKBAR_OPTIONS = { duration: 3000 };
@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  imports: [
    MatMiniFabButton,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatDivider,
    MatCardActions,
    MatIconButton,
    MatCardFooter,
    MatProgressBar,
    MatProgressSpinner,
    MatDialogTitle,
    CdkDrag,
    CdkDragHandle,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    CdkTextareaAutosize,
    MatCheckbox,
    MatButton,
    MatDialogActions,
    MatDialogClose,
    TitleCasePipe,
    DatePipe,
  ],
})
export class NotesComponent implements OnInit {
  private readonly noteService = inject(NoteService);
  private readonly _dialog = inject(MatDialog);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  notes: NoteModel[] = [];
  notesLoaded = signal(false);
  noteForm: FormGroup | null = null;

  @ViewChild('noteDialog', { static: true }) noteDialog: TemplateRef<unknown> | null = null;
  @ViewChild('deleteConfirmDialog', { static: true })
  deleteConfirmDialog: TemplateRef<unknown> | null = null;
  constructor() {}

  ngOnInit(): void {
    this.noteService
      .getAll()
      .pipe(
        tap((notes) => {
          this.notes = notes ?? [];
          this.notesLoaded.set(true);
        })
      )
      .subscribe();
  }

  private createNoteForm(note: NoteModel) {
    this.noteForm = this.fb.group({
      type: [note.type, Validators.required],
      title: [note.title, Validators.required],
      text: note.type === 'text' ? note.body : null,
      list:
        note.type === 'list'
          ? this.fb.array(note.getListItems()?.map(this.listItemToGroup.bind(this)) ?? [])
          : null,
    });
  }

  private listItemToGroup(item: NoteListItem) {
    return this.fb.group({
      label: item.label,
      checked: item.checked,
    });
  }

  private createEmptyNoteForm(type: string) {
    this.noteForm = this.fb.group({
      type: [type, Validators.required],
      title: [null, Validators.required],
      text: null,
      list: this.fb.array([]),
    });
  }

  get noteList() {
    const formArray = this.noteForm?.get('list');
    return formArray ? (formArray as FormArray<FormGroup>) : null;
  }

  addListItem(itemIndex?: number) {
    if (this.noteList == null || this.noteForm == null) return;
    const itemFormGroup = this.fb.group({
      label: [''],
      checked: [false],
    });
    itemIndex = itemIndex ?? this.noteList.length;
    this.noteList.insert(itemIndex, itemFormGroup);
    this.noteForm.patchValue({
      list: this.noteList.value,
    });
    // focus new input element
    of(null)
      .pipe(take(1), delay(50))
      .subscribe(() => {
        const input = document.querySelector(`#list-item-${itemIndex}`);
        if (input instanceof HTMLInputElement) {
          input.focus();
        }
      });
  }

  deleteListItem(itemIndex: number) {
    if (this.noteList == null) return;
    this.noteList.removeAt(itemIndex);
  }

  createNote(button: MatMiniFabButton, type: 'text' | 'list') {
    if (this.noteDialog == null) return;
    this.createEmptyNoteForm(type);
    const element = button._elementRef.nativeElement;
    if (element instanceof HTMLElement) {
      const rectangle = element.getBoundingClientRect();
      const top = rectangle.bottom + 5;
      const left = rectangle.left;
      this._dialog
        .open(this.noteDialog, {
          disableClose: true,
          hasBackdrop: true,
          width: '500px',
          position: {
            top: top + 'px',
            left: left + 'px',
          },
          data: type,
        })
        .afterClosed()
        .pipe(
          switchMap((dialogResult) => {
            const newNote = this.convertFormToNote();
            if (dialogResult && newNote) {
              return this.noteService.add(newNote);
            }
            return EMPTY;
          })
        )
        .subscribe({
          next: (result) => {
            this.notes.unshift(result);
          },
          error: () => {
            this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          },
        });
    }
  }

  deleteNote(note: NoteModel) {
    if (this.deleteConfirmDialog == null) return;
    if (note == null) return;
    this._dialog
      .open(this.deleteConfirmDialog, {
        disableClose: false,
        hasBackdrop: true,
        width: '400px',
        data: note.title,
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult) {
            return this.noteService.delete(note.id);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          const index = this.notes.findIndex((x) => x.id === note.id);
          if (index >= 0) {
            this.notes.splice(index, 1);
          }
        },
        error: () => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
        },
      });
  }

  editNote(note: NoteModel) {
    if (this.noteDialog == null) return;
    this.createNoteForm(note);
    this._dialog
      .open(this.noteDialog, {
        disableClose: true,
        hasBackdrop: true,
        width: '500px',
        data: note.type,
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          const noteUpdate = this.convertFormToNote();
          if (dialogResult && noteUpdate) {
            note.updating = true;
            noteUpdate.id = note.id;
            return this.noteService.update(noteUpdate);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: (result) => {
          const index = this.notes.findIndex((x) => x.id === note.id);
          if (index >= 0) {
            this.notes[index] = result;
          }
        },
        error: () => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
        },
      });
  }

  private convertFormToNote(): NoteModel | null {
    if (this.noteForm == null || this.noteList == null) return null;
    const type = this.noteForm.get('type')?.value;
    const title = this.noteForm.get('title')?.value;
    const text = this.noteForm.get('text')?.value;
    const list = this.noteList.value;

    return new NoteModel({
      type,
      title,
      body: type === 'text' ? text : JSON.stringify(list),
    });
  }
}
