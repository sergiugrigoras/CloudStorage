import { Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, finalize, tap } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-forgot-password',
  imports: [
    FormsModule,
    MatButton,
    MatError,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
})
export class ForgotPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);

  protected readonly emailForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  getResetToken() {
    const email = (this.emailForm.get('email')?.value || '').trim();
    if (email === '') return;
    this.authService
      .forgotPassword(email)
      .pipe(
        catchError((error) => {
          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
              case 404:
                this._snackBar.open(`User not found.`, 'Ok', { duration: 5000 });
                break;
              case 400:
                this._snackBar.open(`${error.error}`, 'Ok', { duration: 5000 });
                break;
              default:
                this._snackBar.open(`An error occurred.`, 'Ok', { duration: 5000 });
                break;
            }
          }
          return EMPTY;
        }),
        tap(() => {
          this._snackBar.open(`Instructions sent to ${email}`, 'Ok', { duration: 5000 });
        }),
        finalize(() => {
          this.emailForm.reset();
        })
      )
      .subscribe();
  }
}
