import { TaskModel } from './../../interfaces/task.interface';
import { NoteModel } from './../../interfaces/note.interface';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
// import { NgNavigatorShareService } from 'ng-navigator-share';
import { NoteService } from 'src/app/services/note.service';
@Component({
  selector: 'app-note',
  templateUrl: './note.component.html',
  styleUrls: ['./note.component.css', '../notes/notes.component.css']
})
export class NoteComponent implements OnInit {
  @Input('note') note: NoteModel = { title: '', body: '', type: 'text' };
  @Output('noteEvent') noteEvent = new EventEmitter();
  tasks: TaskModel[] = [];
  constructor(/* private ngNavigatorShareService: NgNavigatorShareService,  */private noteService: NoteService) { }

  ngOnInit(): void {
    if (this.note.type === 'task') {
      this.tasks = JSON.parse(this.note.body);
    }

  }

  onClick(action: string) {
    window.scrollTo(0, 0);
    this.noteEvent.emit({
      action: action,
      note: {
        id: this.note.id,
        type: this.note.type
      }
    });
  }

  updateNote() {
    this.noteEvent.emit({
      action: 'update',
      note: {
        id: this.note.id,
        title: this.note.title,
        body: JSON.stringify(this.tasks),
        color: this.note.color,
        creationDate: this.note.creationDate,
        modificationDate: this.note.modificationDate,
        type: this.note.type
      }
    });
  }

  shareNote() {
    /*     if (!this.ngNavigatorShareService.canShare()) {
          this.noteEvent.emit({
            action: 'share',
            note: {
              id: this.note.id
            }
          });
          return;
        }
    
        this.noteService.share(this.note.id!).subscribe(
          response => {
            let url = `${window.location.protocol}//${window.location.hostname}:${window.location.port}/note/${this.note.id}?key=${(<any>response).shareKey}`;
            this.ngNavigatorShareService.share({
              title: 'SCS Note',
              text: 'hey, check this note',
              url: url
            }).then((response) => {
              console.log(response);
            })
              .catch((error) => {
                console.log(error);
              });
          }
        ); */


  }
}
