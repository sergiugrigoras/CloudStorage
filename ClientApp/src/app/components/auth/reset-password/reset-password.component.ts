import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../../../services/auth.service';
import { Component, ElementRef, inject, signal, ViewChild, WritableSignal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, finalize, from } from 'rxjs';
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
export class ResetPasswordComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  @ViewChild('formRef') formRef!: ElementRef<HTMLFormElement>;
  protected readonly twoFaToken: WritableSignal<string | null> = signal(null);
  protected readonly returnUrl = '/';
  protected readonly strongPasswordTooltip = PasswordValidators.strongPasswordTooltip;

  protected readonly emailControl = new FormControl<string>(
    this.route.snapshot.queryParams['email'] || '',
    {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }
  );
  protected readonly tokenControl = new FormControl<string>(
    this.route.snapshot.queryParams['token'] || '',
    {
      nonNullable: true,
      validators: [Validators.required],
    }
  );
  protected readonly newPasswordControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, PasswordValidators.strongPasswordValidator],
  });
  protected readonly confirmNewPasswordControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  protected readonly resetPasswordForm = new FormGroup(
    {
      email: this.emailControl,
      token: this.tokenControl,
      newPassword: this.newPasswordControl,
      confirmNewPassword: this.confirmNewPasswordControl,
    },
    PasswordValidators.passwordsMismatch('newPassword', 'confirmNewPassword')
  );
  protected readonly parentErrorMatcher = new PasswordMismatchErrorStateMatcher();
  constructor() {}

  resetPassword() {
    if (this.resetPasswordForm.invalid || this.resetPasswordForm.pending) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }
    this.authService
      .resetPassword(
        this.emailControl.value,
        this.tokenControl.value,
        this.newPasswordControl.value
      )
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
          this.resetForm();
        })
      )
      .subscribe();
  }

  protected resetForm() {
    this.formRef.nativeElement.reset();
    this.emailControl.setValue(this.route.snapshot.queryParams['email'] || '', {
      emitEvent: false,
    });
  }
}
