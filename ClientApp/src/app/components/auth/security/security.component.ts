import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatLabel, MatFormField, MatError, MatSuffix } from '@angular/material/input';
import { QRCodeComponent } from 'angularx-qrcode';
import { AuthService } from '../../../services/auth.service';
import { catchError, take, tap } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, finalize, from } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatProgressBar } from '@angular/material/progress-bar';
import { NgxMaskDirective } from 'ngx-mask';
import { PasswordMismatchErrorStateMatcher } from '../../../utils/password-mismatch-error-state-matcher';
import { PasswordValidators } from '../../../utils/password.validators';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-security',
  imports: [
    FormsModule,
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    QRCodeComponent,
    ReactiveFormsModule,
    MatProgressBar,
    NgxMaskDirective,
    MatError,
    MatSuffix,
    MatTooltip,
  ],
  templateUrl: './security.component.html',
  styleUrl: './security.component.scss',
})
export class SecurityComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  protected readonly isTwoFaEnabled: WritableSignal<boolean | null> = signal(null);
  protected readonly parentErrorMatcher = new PasswordMismatchErrorStateMatcher();
  protected readonly strongPasswordTooltip = PasswordValidators.strongPasswordTooltip;

  protected readonly twoFaForm = new FormGroup({
    password: new FormControl('', Validators.required),
    code: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
    ]),
  });
  protected readonly oldPasswordControl = new FormControl('', Validators.required);
  protected readonly newPasswordControl = new FormControl('', [
    Validators.required,
    PasswordValidators.strongPasswordValidator,
  ]);
  protected readonly confirmNewPasswordControl = new FormControl('', Validators.required);
  protected readonly passwordChangeForm = new FormGroup(
    {
      oldPassword: this.oldPasswordControl,
      newPassword: this.newPasswordControl,
      confirmNewPassword: this.confirmNewPasswordControl,
    },
    PasswordValidators.passwordsMismatch('newPassword', 'confirmNewPassword')
  );

  changePassword() {
    this.passwordChangeForm.markAllAsTouched();
    const oldPassword = this.oldPasswordControl.value || '';
    const newPassword = this.newPasswordControl.value || '';
    if (
      oldPassword === '' ||
      newPassword === '' ||
      this.passwordChangeForm.invalid ||
      this.passwordChangeForm.pending
    ) {
      return;
    }
    this.authService
      .changePassword(oldPassword, newPassword)
      .pipe(
        catchError((error: unknown) => {
          let message = 'An error occurred.';
          if (error instanceof HttpErrorResponse && typeof error.error === 'string') {
            message = error.error;
          }
          this._snackBar.open(message, 'Ok');
          return EMPTY;
        }),
        tap(() => {
          this.passwordChangeForm.reset({
            oldPassword: '',
            newPassword: '',
            confirmNewPassword: '',
          });
          this._snackBar.open(`Password has been changed successfully!`, 'Ok', { duration: 5000 });
        })
      )
      .subscribe();
  }

  protected readonly otpUri = signal('');
  protected readonly processing = signal(false);
  protected readonly showTwoFaDisableForm = signal(false);
  private _secretKey: string | null = null;
  ngOnInit(): void {
    this.authService.isTwoFaEnabled().subscribe((result) => {
      this.isTwoFaEnabled.set(result);
    });
  }

  copySecretKey(): void {
    if (this._secretKey) {
      from(navigator.clipboard.writeText(this._secretKey))
        .pipe(
          take(1),
          catchError(() => {
            this._snackBar.open(`Could not copy the secret key.`, 'Ok');
            return EMPTY;
          }),
          tap(() => {
            this._snackBar.open(`Secret key copied.`, 'Ok');
          })
        )
        .subscribe();
    }
  }

  setupTwoFa() {
    this.processing.set(true);
    this.authService
      .setupTwoFa()
      .pipe(
        catchError(() => {
          this._snackBar.open('An error occurred.', 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          this.otpUri.set(result.otpUri);
          this._secretKey = result.secretKey;
        }),
        finalize(() => {
          this.processing.set(false);
        })
      )
      .subscribe();
  }

  toggleTwoFa() {
    this.processing.set(true);
    const password = this.twoFaForm.get('password')?.value || '';
    const code = this.twoFaForm.get('code')?.value || '';

    if (password === '' || code === '') return;
    this.authService
      .toggleTwoFa(password, code)
      .pipe(
        catchError((error) => {
          if (
            error instanceof HttpErrorResponse &&
            error.status === 400 &&
            typeof error.error === 'string'
          ) {
            this._snackBar.open(error.error, 'Ok');
          } else {
            this._snackBar.open('An error occurred.', 'Ok');
          }
          return EMPTY;
        }),
        tap((result) => {
          this.twoFaForm.reset({ password: '', code: '' });
          this.otpUri.set('');
          this.isTwoFaEnabled.set(result);
          this._snackBar.open(
            `Two-Factor Authentication ${result ? 'Enabled' : 'Disabled'}.`,
            'Ok'
          );
        }),
        finalize(() => {
          this.processing.set(false);
          this.showTwoFaDisableForm.set(false);
        })
      )
      .subscribe();
  }
}
