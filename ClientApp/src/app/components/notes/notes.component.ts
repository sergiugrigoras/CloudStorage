import { NoteService } from './../../services/note.service';
import { NoteModel } from './../../interfaces/note.interface';
import { Component, ElementRef, Inject, OnInit, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core';
import { tap } from 'rxjs/operators';
import { DOCUMENT } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-notes',
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css'],
})
export class NotesComponent implements OnInit {

  notes: NoteModel[] = [];
  activeNoteDel: NoteModel = { title: '', body: '', type: '' };
  activeNoteUpdate: NoteModel = { title: '', body: '', type: '' };
  noteEditorState: string = 'read';
  @ViewChild('deleteConfirmModal') deleteConfirmModal?: TemplateRef<any>;
  @ViewChild('shareConfirmModal') shareConfirmModal?: TemplateRef<any>;

  constructor(private noteService: NoteService, private _dialog: MatDialog, @Inject(DOCUMENT) document: any) { }

  ngOnInit(): void {
    this.noteService.getAll().pipe(
      tap((notes) => {
        this.notes = notes;
      })
    ).subscribe();
  }
  copyUrl(input: HTMLInputElement) {
    input.focus();
    input.select();
    document.execCommand('copy');
  }

  openModal(options: any) {
    switch (options.action) {
      case 'delete': {
        let note = this.getNoteById(options.note.id);
        if (note)
          this.activeNoteDel = note;
        let modalRef = this._dialog.open(this.deleteConfirmModal);
        break;
      }
      case 'share': {
        let modalRef = this._dialog.open(this.shareConfirmModal);
        break;
      }
      default: {
        break;
      }
    }
  }

  doAction(event: any) {
    if (event.action === 'delete')
      this.openModal(event);
    else if (event.action === 'edit') {
      this.noteEditorState = 'edit'
      let note = this.getNoteById(event.note.id);
      if (note)
        this.activeNoteUpdate = note;
    }
    else if (event.action === 'update') {
      let note = this.getNoteById(event.note.id);
      if (note) {
        let index = this.notes.indexOf(note);
        this.notes.splice(index, 1, event.note);
        this.noteService.update(event.note).subscribe();
      }
    }
    else if (event.action === 'add') {
      this.noteService.add({
        title: event.note.title,
        body: event.note.body,
        color: event.note.color,
        type: event.note.type,
      }).subscribe(res => {
        this.notes.unshift(res);
      });
    }
    else if (event.action === 'share') {
      this.noteService.share(event.note.id).subscribe(
        res => this.openModal({
          action: 'share',
          url: `${window.location.protocol}//${window.location.hostname}:${window.location.port}/note/${event.note.id}?key=${(<any>res).shareKey}`,
        })
      );
    }
  }

  getNoteById(id: number) {
    return this.notes.find(e => e.id! == id);
  }

  deleteNote() {
    if (this.activeNoteDel) {
      this.deleteNoteById(this.activeNoteDel.id!);
      this.noteService.delete(this.activeNoteDel.id!).subscribe();
    }
  }

  deleteNoteById(id: number) {
    let note = this.getNoteById(id);
    if (note) {
      let index = this.notes.indexOf(note);
      this.notes.splice(index, 1);
    }
  }

  changeNoteEditorState(event: string) {
    this.noteEditorState = event;
    this.activeNoteUpdate = { title: '', body: '', type: 'text' };
  }

}