import { HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { PasswordValidators } from './password.validators';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';
import { PasswordService } from 'src/app/services/password.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  profileForm = new FormGroup({
    profileInfo: new FormGroup({
      username: new FormControl(this.authService.getUser()),
      email: new FormControl(this.authService.getEmail()),
    }),
    passwordChange: new FormGroup({
      oldPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', Validators.required),
      confirmNewPassword: new FormControl('', Validators.required),
    }, PasswordValidators.passwordsShouldMatch)
  });

  constructor(private authService: AuthService, private passwordService: PasswordService, private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
  }


  get oldPassword() {
    return this.profileForm.get('passwordChange.oldPassword');
  }

  set oldPassword(value: any) {
    this.profileForm.get('passwordChange.oldPassword').setValue(value);
  }

  get newPassword() {
    return this.profileForm.get('passwordChange.newPassword');
  }

  set newPassword(value: any) {
    this.profileForm.get('passwordChange.newPassword').setValue(value);
  }

  get confirmNewPassword() {
    return this.profileForm.get('passwordChange.confirmNewPassword');
  }

  set confirmNewPassword(value: any) {
    this.profileForm.get('passwordChange.confirmNewPassword').setValue(value);
  }

  resetPasswordFields() {
    this.profileForm.get('passwordChange.oldPassword').reset();
    this.profileForm.get('passwordChange.newPassword').reset();
    this.profileForm.get('passwordChange.confirmNewPassword').reset();
  }

  changePassword() {
    this.passwordService.changePassword(this.oldPassword?.value, this.newPassword?.value)
      .subscribe({
        next: () => {
          this.resetPasswordFields();
          this._snackBar.open(`Password has been changed successfully!`, 'Ok', { duration: 5000 });
        },
        error: (error: any) => {
          if (error instanceof HttpErrorResponse && error.status === 400) {
            this._snackBar.open(`Error. Invalid password.`, 'Ok', { duration: 5000 });
          } else {
            this._snackBar.open(`An error occurred.`, 'Ok', { duration: 5000 });
          }
        }
      });
  }

}
