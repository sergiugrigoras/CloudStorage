import { NoteService } from '../../services/note.service';
import { NoteModel } from '../../interfaces/note.interface';
import { Component, ElementRef, Inject, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import {switchMap, tap} from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import {MatSnackBar} from "@angular/material/snack-bar";
import {FormControl, FormGroup, Validators} from "@angular/forms";
import {MatButton} from "@angular/material/button";
import {EMPTY} from "rxjs";

const SNACKBAR_OPTIONS = { duration: 3000 };
const TEXT = 'Morbi gravida est tellus, blandit suscipit lacus efficitur ut. Donec ut diam id tortor porttitor pellentesque. Phasellus in ex tortor. Cras eget rutrum lectus. In facilisis sapien dui, vel aliquet purus porta vel. Aenean at dolor ut tellus iaculis vestibulum. Suspendisse vitae eros eu mi laoreet tincidunt luctus quis nibh. Maecenas porttitor arcu at interdum euismod. Aliquam pretium tortor sit amet purus vehicula hendrerit et ut dolor. Proin mattis sit amet dui ut tempor. Ut id cursus turpis. Pellentesque at orci eget justo ultrices lacinia eget sed lorem.';
const BIG_TEXT = 'Morbi gravida est tellus, blandit suscipit lacus efficitur ut. Donec ut diam id tortor porttitor pellentesque. Phasellus in ex tortor. Cras eget rutrum lectus. In facilisis sapien dui, vel aliquet purus porta vel. Aenean at dolor ut tellus iaculis vestibulum. Suspendisse vitae eros eu mi laoreet tincidunt luctus quis nibh. Maecenas porttitor arcu at interdum euismod. Aliquam pretium tortor sit amet purus vehicula hendrerit et ut dolor. Proin mattis sit amet dui ut tempor. Ut id cursus turpis. Pellentesque at orci eget justo ultrices lacinia eget sed lorem.\n' +
  '\n' +
  'Nulla eget urna sit amet purus pulvinar finibus ut semper lorem. Quisque mollis molestie nibh vel rhoncus. Ut lacinia a turpis non vestibulum. Nullam sed vehicula orci. Proin ornare lacus sit amet blandit iaculis. Suspendisse tincidunt justo sed condimentum accumsan. Maecenas ultricies nisl at magna maximus, et feugiat mauris accumsan. Morbi porttitor, est nec pulvinar commodo, orci erat gravida tellus, in suscipit ipsum ligula id metus. Praesent malesuada velit a lobortis ultrices. Nam vel lobortis ex. Sed ac dolor fringilla, sodales ex in, vulputate tortor. Duis egestas tincidunt nisl ut egestas.\n' +
  '\n' +
  'Duis enim ipsum, consequat eget mauris a, dictum cursus leo. Quisque consequat felis in dolor mollis, vitae egestas nulla auctor. Donec eget justo nunc. Maecenas finibus enim in mauris tempus congue. Sed egestas nisi ante, sed dictum nisl dictum placerat. Quisque sed quam lorem. Fusce tristique mauris eu ex luctus, ut mollis orci dictum. Nunc quis hendrerit turpis. Maecenas facilisis libero ac molestie sagittis. Aenean ac euismod dolor, vel feugiat mi.';
@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.scss'],
})
export class NotesComponent implements OnInit {
  notes: NoteModel[];
  newNoteControl = new FormGroup({
    title: new FormControl('', Validators.required),
    body: new FormControl('')
  });

  editNoteControl = new FormGroup({
    title: new FormControl('', Validators.required),
    body: new FormControl('')
  });
  @ViewChild('newNoteDialog', { static: true }) newNoteDialog: TemplateRef<any>;
  @ViewChild('editNoteDialog', { static: true }) editNoteDialog: TemplateRef<any>;
  @ViewChild('deleteConfirmDialog', { static: true }) deleteConfirmDialog: TemplateRef<any>;
  constructor(
    private noteService: NoteService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,) { }

  ngOnInit(): void {
    this.noteService.getAll().pipe(
      tap((notes) => {
        this.notes = notes;
/*        for (let i = 0; i < 30; i++) {
          this.notes.push({
            title: 'Lorem ipsum dolor sit amet',
            body: BIG_TEXT,
            creationDate: new Date(),
            type: 'text',
          })
        }*/
      })
    ).subscribe();
  }

  private resetCreateForm() {
    this.newNoteControl.reset({
      title: '',
      body: ''
    });
  }
  createNote(button: MatButton) {
    const element = button._elementRef.nativeElement;
    if (element instanceof HTMLButtonElement) {
      const rectangle = element.getBoundingClientRect();
      const top = rectangle.bottom + 5;
      const left = rectangle.left;
      this._dialog.open(this.newNoteDialog, {
        disableClose: true,
        hasBackdrop: true,
        width: '500px',
        position: {
          top: top +'px',
          left: left + 'px'
        }
      }).afterClosed().pipe(
        switchMap(dialogResult => {
          if (dialogResult) {
            return this.noteService.add({
              title: this.newNoteControl.get('title')?.value,
              body: this.newNoteControl.get('body')?.value,
              type: 'text'
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
          this.resetCreateForm();
        },
        complete: () => {
          this.resetCreateForm();
        }
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
    this.editNoteControl.get('title')?.setValue(note.title);
    this.editNoteControl.get('body')?.setValue(note.body);

    this._dialog.open(this.editNoteDialog, {
      disableClose: true,
      hasBackdrop: true,
      width: '500px'
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          return this.noteService.update({
            title: this.editNoteControl.get('title')?.value,
            body: this.editNoteControl.get('body')?.value,
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
}
