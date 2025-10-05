import {Component, OnInit} from '@angular/core';
import {AdminService} from "../../services/admin.service";
import {User} from "../../model/user.model";
import {UserModel} from "../../interfaces/user.interface";
import {MatSnackBar} from "@angular/material/snack-bar";
import {MatDialog} from "@angular/material/dialog";
import {SpinnerComponent} from "../spinner/spinner.component";
import {catchError, EMPTY, finalize, tap} from "rxjs";
import {HttpErrorResponse} from "@angular/common/http";
import {FormControl, Validators} from "@angular/forms";

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  users: User[] = null;
  inviteControl: FormControl<string>;
  constructor(
    private readonly _adminService: AdminService,
    private readonly _snackBar: MatSnackBar,
    private readonly _dialog: MatDialog
    ) {
  }

  ngOnInit(): void {
    this.inviteControl = new FormControl("", [Validators.email, Validators.required]);
    this._adminService.getAllUsers().subscribe(users => {
      this.users = [...users];
    })
  }

  toggleAccount(user: User) {
    const dialogRef = this._dialog.open(SpinnerComponent, {hasBackdrop: true, disableClose: true});
    const updateUser: User = {
      ...user,
    };
    updateUser.disabled = !user.disabled;
    this._adminService.toggleAccount(updateUser)
      .pipe(
        catchError((error: Error) => {
          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
              case 400:
                this._snackBar.open(`${error.error}`, 'Ok', {duration: 3000});
                break;
              case 404:
                this._snackBar.open('User not found.', 'Ok', {duration: 3000});
                break;
              default:
                this._snackBar.open('An error occurred.', 'Ok', {duration: 3000});
                break;
            }
          }
          return EMPTY;
        }),
        tap(result => {
          const index = this.users.findIndex(x => x.id === result.id);
          if (index >= 0) {
            this.users[index] = result;
            this._snackBar.open(`User ${user.username} successfully updated.`, 'Ok', {duration: 3000});
          }
        }),
        finalize(() => {
          dialogRef?.close();
        })
      )
      .subscribe()
  }

  getInviteControlError() {
    if (!this.inviteControl.errors) return '';
    if (this.inviteControl.errors['required']) return 'This field is required';
    if (this.inviteControl.errors['email']) return 'Invalid email address';
    return 'Error';
  }

  sendInviteCode() {
    if (this.inviteControl.invalid) return;
    this._adminService.sendInviteCode(this.inviteControl.value)
      .pipe(
        catchError(error => {
          if (error instanceof HttpErrorResponse) {
            this._snackBar.open(`${error.error}`, 'Ok', {duration: 3000});
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
