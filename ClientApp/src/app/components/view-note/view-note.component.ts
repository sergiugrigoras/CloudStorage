import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { NoteModel } from 'src/app/interfaces/note.interface';
import { TaskModel } from 'src/app/interfaces/task.interface';
import { NoteService } from 'src/app/services/note.service';

@Component({
  selector: 'app-view-note',
  templateUrl: './view-note.component.html',
  styleUrls: ['./view-note.component.css', '../notes/notes.component.css']
})
export class ViewNoteComponent implements OnInit {

  key: string = '';
  id: number = -1;
  note: NoteModel = { title: '', body: '', type: '' };
  tasks: TaskModel[] = [];
  isReady = false;
  titleExtra = '';
  constructor(private route: ActivatedRoute, private router: Router, private noteService: NoteService) { }

  ngOnInit(): void {
    this.key = this.route.snapshot.queryParams['key'] || '';
    this.route.paramMap
      .pipe(
        switchMap(params => {
          let id = params.get('id');
          if (id) {
            if (isNaN(+id) || +id <= 0 || !Number.isInteger(+id)) {
              return throwError('Invalid id');
            }
            else {
              return of(+id)
            }
          } else {
            return throwError('No id');
          }
        }),
        tap(id => {
          this.id = id;
        }),
        switchMap(id => {
          return this.noteService.get(id, this.key);
        })
      ).subscribe(
        note => {
          this.note = note;
          this.isReady = true;
          if (note.type === 'task') {
            let localTasks = localStorage.getItem(`note-${note.id}`)
            if (localTasks) {
              this.titleExtra = '(Copy)';
              this.tasks = JSON.parse(localTasks);
            }
            else
              this.tasks = JSON.parse(note.body);
          }
        },
        error => {
          if (error instanceof HttpErrorResponse && error.status === 403)
            console.log('Forbidden');
          this.router.navigate(['/']);
        }
      );
  }

  saveChanges() {
    localStorage.setItem(`note-${this.note.id}`, JSON.stringify(this.tasks));
    this.titleExtra = '(Copy)';
  }

  reload() {
    localStorage.removeItem(`note-${this.note.id}`);
    this.titleExtra = '';
    this.noteService.get(this.id, this.key).subscribe(note => {
      this.note = note;
      this.tasks = JSON.parse(note.body);
    });
  }
}
