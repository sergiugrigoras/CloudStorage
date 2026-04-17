import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, finalize, from, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormField, MatLabel, MatInput, MatError, MatSuffix } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { LoginTwoFaComponent } from '../login-two-fa/login-two-fa.component';
import { TokenType } from '../../../interfaces/token.interface';
import { PasswordMismatchErrorStateMatcher } from '../../../utils/password-mismatch-error-state-matcher';
import { PasswordValidators } from '../../../utils/password.validators';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatButton,
    LoginTwoFaComponent,
    MatIcon,
    MatSuffix,
    MatTooltip,
  ],
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  protected readonly twoFaToken: WritableSignal<string | null> = signal(null);
  resetToken = signal('');
  resetEmail = signal('');
  protected readonly returnUrl = '/';
  protected readonly strongPasswordTooltip = PasswordValidators.strongPasswordTooltip;
  protected readonly emailForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  protected readonly newPasswordControl = new FormControl('', [
    Validators.required,
    PasswordValidators.strongPasswordValidator,
  ]);
  protected readonly confirmNewPasswordControl = new FormControl('', Validators.required);
  protected readonly passwordForm = new FormGroup(
    {
      newPassword: this.newPasswordControl,
      confirmNewPassword: this.confirmNewPasswordControl,
    },
    PasswordValidators.passwordsMismatch('newPassword', 'confirmNewPassword')
  );
  protected readonly parentErrorMatcher = new PasswordMismatchErrorStateMatcher();
  constructor() {}

  ngOnInit(): void {
    this.resetToken.set(this.route.snapshot.queryParams['token'] || '');
    this.resetEmail.set(this.route.snapshot.queryParams['email'] || '');
  }

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

  resetPassword() {
    this.passwordForm.markAllAsTouched();
    const newPassword = this.newPasswordControl.value || '';
    if (newPassword === '' || this.passwordForm.invalid || this.passwordForm.pending) {
      return;
    }

    this.authService
      .resetPassword(this.resetEmail(), this.resetToken(), newPassword)
      .pipe(
        catchError(() => {
          this._snackBar.open(`Invalid reset token.`, 'Ok', { duration: 5000 });
          return EMPTY;
        }),
        switchMap((token) => {
          this._snackBar.open(`Password has been changed successfully.`, 'Ok', { duration: 5000 });
          if (token.tokenType === TokenType.Authentication) {
            this.authService.loginUser(token);
            return from(this.router.navigate([this.returnUrl]));
          }
          if (token.tokenType === TokenType.TwoFactorAuthentication) {
            this.twoFaToken.set(token.token);
          }
          return EMPTY;
        }),
        finalize(() => {
          this.passwordForm.reset({ newPassword: '', confirmNewPassword: '' });
        })
      )
      .subscribe();
  }
}
