import { HttpErrorResponse } from '@angular/common/http';
import { PasswordValidators } from './password.validators';
import {FormControl, FormGroup, FormGroupDirective, Validators} from '@angular/forms';
import {Component, OnInit, ViewChild} from '@angular/core';
import { AuthService } from 'src/app/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss'],
    standalone: false
})
export class ProfileComponent implements OnInit {
  @ViewChild(FormGroupDirective) formDirective: FormGroupDirective;
  profileForm = new FormGroup({
    profileInfo: new FormGroup({
      username: new FormControl(this.authService.getUserNameFromJwtToken()),
      email: new FormControl(this.authService.getEmailFromJwtToken()),
      roles: new FormControl(this.authService.getRolesFromJwtToken()),
    }),
    passwordChange: new FormGroup({
      oldPassword: new FormControl('', Validators.required),
      newPassword: new FormControl('', Validators.required),
      confirmNewPassword: new FormControl('', Validators.required),
    }, PasswordValidators.passwordsShouldMatch)
  });

  constructor(private authService: AuthService, private _snackBar: MatSnackBar) { }

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
    this.formDirective.resetForm({
      profileInfo : {
        username: this.authService.getUserNameFromJwtToken(),
        email: this.authService.getEmailFromJwtToken(),
        roles: this.authService.getRolesFromJwtToken(),
      },
    });
  }

  changePassword() {
    this.authService.changePassword(this.oldPassword?.value, this.newPassword?.value)
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
