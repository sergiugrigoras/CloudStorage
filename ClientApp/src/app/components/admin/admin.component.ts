import { Component, inject, OnInit, signal } from '@angular/core';
import { AdminService } from '../../services/admin.service';
import { User } from '../../model/user.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { SpinnerComponent } from '../spinner/spinner.component';
import { catchError, EMPTY, finalize, tap } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/list';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
  imports: [
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    ReactiveFormsModule,
    MatError,
    MatButton,
    MatDivider,
    DatePipe,
  ],
})
export class AdminComponent implements OnInit {
  private readonly _adminService = inject(AdminService);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly _dialog = inject(MatDialog);
  users: User[] = [];
  usersReady = signal(false);
  inviteControl: FormControl<string | null> = new FormControl('', [
    Validators.email,
    Validators.required,
  ]);
  constructor() {}

  ngOnInit(): void {
    this._adminService
      .getAllUsers()
      .pipe(
        catchError(() => {
          this._snackBar.open('An error occurred.', 'Ok', { duration: 3000 });
          return EMPTY;
        }),
        tap((users) => {
          this.users = [...users];
        }),
        finalize(() => {
          this.usersReady.set(true);
        })
      )
      .subscribe();
  }

  toggleAccount(user: User) {
    const dialogRef = this._dialog.open(SpinnerComponent, {
      hasBackdrop: true,
      disableClose: true,
    });
    const updateUser: User = {
      ...user,
    };
    updateUser.disabled = !user.disabled;
    this._adminService
      .toggleAccount(updateUser)
      .pipe(
        catchError((error: Error) => {
          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
              case 400:
                this._snackBar.open(`${error.error}`, 'Ok', { duration: 3000 });
                break;
              case 404:
                this._snackBar.open('User not found.', 'Ok', { duration: 3000 });
                break;
              default:
                this._snackBar.open('An error occurred.', 'Ok', { duration: 3000 });
                break;
            }
          }
          return EMPTY;
        }),
        tap((result) => {
          const index = this.users.findIndex((x) => x.id === result.id);
          if (index >= 0) {
            this.users[index] = result;
            this._snackBar.open(`User ${user.username} successfully updated.`, 'Ok', {
              duration: 3000,
            });
          }
        }),
        finalize(() => {
          dialogRef?.close();
        })
      )
      .subscribe();
  }

  getInviteControlError() {
    if (!this.inviteControl.errors) return '';
    if (this.inviteControl.errors['required']) return 'This field is required';
    if (this.inviteControl.errors['email']) return 'Invalid email address';
    return 'Error';
  }

  sendInviteCode() {
    if (this.inviteControl.invalid) return;
    this._adminService
      .sendInviteCode((this.inviteControl.value || '').trim())
      .pipe(
        catchError((error) => {
          if (error instanceof HttpErrorResponse) {
            this._snackBar.open(`${error.error}`, 'Ok', { duration: 3000 });
          }
          return EMPTY;
        }),
        tap(() => {
          this.inviteControl.reset();
        })
      )
      .subscribe();
  }
}
