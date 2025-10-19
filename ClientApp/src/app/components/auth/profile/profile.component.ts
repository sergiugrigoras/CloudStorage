import { HttpErrorResponse } from '@angular/common/http';
import { PasswordValidators } from './password.validators';
import {
  FormControl,
  FormGroup,
  FormGroupDirective,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Component, inject, ViewChild } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatButton],
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  @ViewChild(FormGroupDirective) formDirective: FormGroupDirective | undefined;
  profileForm = new FormGroup({
    profileInfo: new FormGroup({
      username: new FormControl(this.authService.getUserNameFromJwtToken()),
      email: new FormControl(this.authService.getEmailFromJwtToken()),
      roles: new FormControl(this.authService.getRolesFromJwtToken()),
    }),
    passwordChange: new FormGroup(
      {
        oldPassword: new FormControl('', Validators.required),
        newPassword: new FormControl('', Validators.required),
        confirmNewPassword: new FormControl('', Validators.required),
      },
      PasswordValidators.passwordsShouldMatch
    ),
  });

  constructor() {}

  get oldPassword() {
    return this.profileForm.get('passwordChange.oldPassword');
  }

  get newPassword() {
    return this.profileForm.get('passwordChange.newPassword');
  }

  get confirmNewPassword() {
    return this.profileForm.get('passwordChange.confirmNewPassword');
  }

  resetPasswordFields() {
    this.formDirective?.resetForm({
      profileInfo: {
        username: this.authService.getUserNameFromJwtToken(),
        email: this.authService.getEmailFromJwtToken(),
        roles: this.authService.getRolesFromJwtToken(),
      },
    });
  }

  changePassword() {
    const oldPassword = this.profileForm.get('passwordChange.newPassword')?.value || '';
    const newPassword = this.profileForm.get('passwordChange.newPassword')?.value || '';
    if (oldPassword === '' || newPassword === '') {
      return;
    }
    this.authService.changePassword(oldPassword, newPassword).subscribe({
      next: () => {
        this.resetPasswordFields();
        this._snackBar.open(`Password has been changed successfully!`, 'Ok', { duration: 5000 });
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 400) {
          this._snackBar.open(`Error. Invalid password.`, 'Ok', { duration: 5000 });
        } else {
          this._snackBar.open(`An error occurred.`, 'Ok', { duration: 5000 });
        }
      },
    });
  }
}
