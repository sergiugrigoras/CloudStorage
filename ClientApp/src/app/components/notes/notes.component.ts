import { NoteService } from '../../services/note.service';
import {
  ChecklistItem,
  ListNoteFormValue,
  NoteModel,
  NoteType,
  TextNoteFormValue,
} from '../../model/note.model';
import {
  Component,
  ElementRef,
  inject,
  OnInit,
  QueryList,
  signal,
  TemplateRef,
  ViewChild,
  ViewChildren,
  WritableSignal,
} from '@angular/core';
import { catchError, switchMap, tap } from 'rxjs/operators';
import {
  DialogPosition,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { EMPTY, finalize } from 'rxjs';
import { DatePipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardFooter,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatDivider } from '@angular/material/list';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { CdkTextareaAutosize } from '@angular/cdk/text-field';
import { MatCheckbox } from '@angular/material/checkbox';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
  imports: [
    MatIcon,
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
    DatePipe,
  ],
})
export class NotesComponent implements OnInit {
  private readonly noteService = inject(NoteService);
  private readonly _dialog = inject(MatDialog);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  protected readonly notes: WritableSignal<NoteModel[] | null> = signal(null);
  protected readonly textNoteForm = this.fb.nonNullable.group({
    title: this.fb.nonNullable.control('', Validators.required),
    text: this.fb.nonNullable.control(''),
  });
  protected readonly listNoteForm = this.fb.nonNullable.group({
    title: this.fb.nonNullable.control('', Validators.required),
    list: this.fb.nonNullable.array<FormGroup<ChecklistItemGroup>>([]),
  });

  @ViewChild('textNoteDialog', { static: true }) textNoteTemplateRef!: TemplateRef<unknown>;
  @ViewChild('listNoteDialog', { static: true }) listNoteTemplateRef!: TemplateRef<unknown>;
  @ViewChild('deleteConfirmDialog', { static: true })
  deleteConfirmDialog!: TemplateRef<unknown>;
  @ViewChildren('listInput') listInputs!: QueryList<ElementRef<HTMLInputElement>>;
  @ViewChild('titleInput') titleInput!: ElementRef<HTMLInputElement>;

  constructor() {}

  ngOnInit(): void {
    this.noteService
      .getAll()
      .pipe(
        catchError(() => {
          return EMPTY;
        }),
        tap((notes) => {
          this.notes.set([...notes]);
        })
      )
      .subscribe();
  }

  get listNoteFormArray() {
    return this.listNoteForm.get('list') as FormArray<FormGroup<ChecklistItemGroup>>;
  }

  private clearForms() {
    this.textNoteForm.reset({
      title: '',
      text: '',
    });

    while (this.listNoteFormArray.length > 0) {
      this.listNoteFormArray.removeAt(0);
    }
    this.listNoteForm.reset({ title: '', list: [] });
  }

  addListItem(itemIndex?: number) {
    const itemFormGroup = this.fb.nonNullable.group({
      label: '',
      checked: false,
    });
    itemIndex = itemIndex ?? this.listNoteFormArray.length;
    this.listNoteFormArray.insert(itemIndex, itemFormGroup);

    setTimeout(() => {
      const inputArray = this.listInputs.toArray();
      if (inputArray[itemIndex]) {
        inputArray[itemIndex].nativeElement.focus();
      }
    });
  }

  removeListItem(index: number) {
    this.listNoteFormArray.removeAt(index);
  }

  createNote(button: MatButton, type: NoteType) {
    const templateRef =
      type === NoteType.Text ? this.textNoteTemplateRef : this.listNoteTemplateRef;
    const element = button._elementRef.nativeElement;
    if (!(element instanceof HTMLElement)) {
      return;
    }
    this._dialog
      .open(templateRef, {
        disableClose: true,
        hasBackdrop: true,
        width: '500px',
        position: this.getDialogPositionFromElement(element),
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          const newNote = this.getNoteFromForm(type);
          if (dialogResult && newNote) {
            return this.noteService.add(newNote);
          }
          return EMPTY;
        }),
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          this.notes.update((value) => {
            if (value === null) return [];
            return [result, ...value];
          });
        }),
        finalize(() => {
          this.clearForms();
        })
      )
      .subscribe();
  }

  editNote(note: NoteModel) {
    const templateRef =
      note.type === NoteType.Text ? this.textNoteTemplateRef : this.listNoteTemplateRef;
    this.setFormValue(note);
    this._dialog
      .open(templateRef, {
        disableClose: true,
        hasBackdrop: true,
        width: '500px',
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          const noteUpdate = this.getNoteFromForm(note.type);
          if (dialogResult && noteUpdate) {
            noteUpdate.id = note.id;
            note.updating.set(true);
            return this.noteService.update(noteUpdate);
          }
          return EMPTY;
        }),
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          this.notes.update((value) => {
            if (value === null) return [];
            const index = value.findIndex((x) => x.id === result.id);
            if (index >= 0) {
              value[index] = result;
            }
            return [...value];
          });
        }),
        finalize(() => {
          this.clearForms();
        })
      )
      .subscribe();
  }

  private getDialogPositionFromElement(element: HTMLElement): DialogPosition {
    const rectangle = element.getBoundingClientRect();
    const top = rectangle.bottom + 5;
    const left = rectangle.left;
    return {
      top: top + 'px',
      left: left + 'px',
    };
  }

  deleteNote(note: NoteModel) {
    const nodeId = note?.id;
    if (!nodeId) return;
    this._dialog
      .open(this.deleteConfirmDialog, {
        disableClose: false,
        hasBackdrop: true,
        width: '400px',
        data: note.title,
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult) {
            return this.noteService.delete(nodeId);
          }
          return EMPTY;
        }),
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap(() => {
          this.notes.update((value) => {
            if (value === null) return [];
            const index = value.findIndex((x) => x.id === nodeId);
            if (index >= 0) {
              value.splice(index, 1);
            }
            return [...value];
          });
        })
      )
      .subscribe();
  }

  private getNoteFromForm(type: NoteType) {
    if (type === NoteType.Text) {
      return NoteModel.fromTextFormValue(this.textNoteForm.value as TextNoteFormValue);
    }
    if (type === NoteType.List) {
      return NoteModel.fromListFormValue(this.listNoteForm.value as ListNoteFormValue);
    }
    return null;
  }

  private setFormValue(note: NoteModel) {
    const listItemToGroup = (item: ChecklistItem) =>
      this.fb.nonNullable.group({ label: item.label, checked: item.checked });
    if (note.type === NoteType.Text) {
      this.textNoteForm.setValue({
        title: note.title,
        text: note.text ?? '',
      });
    } else if (note.type === NoteType.List) {
      const groups = (note.checklist || []).map((item) => listItemToGroup(item));
      this.listNoteForm.setControl('list', this.fb.nonNullable.array(groups));
      this.listNoteForm.patchValue({ title: note.title });
    }
  }

  removeItemIfEmpty(index: number) {
    if (this.listNoteFormArray.at(index).controls.label.value === '') {
      this.removeListItem(index);
      const inputArray = this.listInputs.toArray();
      const previousInput = inputArray[index - 1];
      if (previousInput) {
        previousInput.nativeElement.focus();
      } else {
        this.titleInput.nativeElement.focus();
      }
    }
  }

  protected readonly NoteType = NoteType;
}

interface ChecklistItemGroup {
  label: FormControl<string>;
  checked: FormControl<boolean>;
}
