import { UserModel } from '../../../interfaces/user.interface';
import { AuthService } from '../../../services/auth.service';
import { PasswordValidators } from '../../../utils/password.validators';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { UsernameValidators } from '../../../utils/username.validators';
import { catchError, EMPTY, Subject, takeUntil } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatError } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { PasswordMismatchErrorStateMatcher } from '../../../utils/password-mismatch-error-state-matcher';
import { tap } from 'rxjs/operators';
import { NgxMaskDirective } from 'ngx-mask';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatIcon,
    MatSuffix,
    MatTooltip,
    MatError,
    MatButton,
    NgxMaskDirective,
  ],
})
export class RegisterComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly passwordMismatchErrorStateMatcher = new PasswordMismatchErrorStateMatcher();
  protected readonly nameControl = new FormControl(
    '',
    {
      nonNullable: true,
      validators: [Validators.required, UsernameValidators.checkPattern],
    }
    // UsernameValidators.checkUnique(this.authService)
  );
  protected readonly emailControl = new FormControl(
    '',
    {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }
    // UsernameValidators.checkUnique(this.authService)
  );
  protected readonly inviteCodeControl = new FormControl('', { nonNullable: true });
  protected readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, PasswordValidators.strongPasswordValidator],
  });

  protected readonly confirmPasswordControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  registerForm = new FormGroup(
    {
      username: this.nameControl,
      email: this.emailControl,
      inviteCode: this.inviteCodeControl,
      password: this.passwordControl,
      confirmPassword: this.confirmPasswordControl,
    },
    PasswordValidators.passwordsMismatch('password', 'confirmPassword')
  );

  protected readonly usernameTooltip = `Starts with a letter.
Contains letters, numbers, dash, underscore, or period.
Length 5-32.`;
  protected readonly strongPasswordTooltip = PasswordValidators.strongPasswordTooltip;

  protected readonly inviteCodePatterns = { S: { pattern: /[A-Za-z0-9]/ } };
  private readonly destroy$ = new Subject<void>();

  constructor() {}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    const inviteCode = this.route.snapshot.queryParams['inviteCode'];
    const email = this.route.snapshot.queryParams['email'];

    this.nameControl.statusChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.nameErrors.set(this.nameControl.errors);
        })
      )
      .subscribe();

    this.emailControl.statusChanges
      .pipe(
        takeUntil(this.destroy$),
        tap(() => {
          this.emailErrors.set(this.emailControl.errors);
        })
      )
      .subscribe();

    this.inviteCodeControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        tap((value) => {
          if (value) this.inviteCodeControl.setValue(value.toUpperCase(), { emitEvent: false });
        })
      )
      .subscribe();

    if (inviteCode) {
      this.inviteCodeControl.setValue(inviteCode);
    }
    if (email) {
      this.emailControl.setValue(email);
    }
  }

  register() {
    this.registerForm.markAllAsTouched();
    if (this.registerForm.invalid || this.registerForm.pending) {
      return;
    }
    const user: UserModel = {
      name: this.nameControl.value,
      email: this.emailControl.value,
      password: this.passwordControl.value,
    };
    const inviteCode = (this.inviteCodeControl.value || '').trim();
    this.authService
      .register(user, inviteCode)
      .pipe(
        catchError((error) => {
          if (error instanceof HttpErrorResponse) {
            this.snackBar.open(error.error, 'Ok', { duration: 5000 });
          }
          return EMPTY;
        })
      )
      .subscribe(() => {
        void this.router.navigate(['/']);
      });
  }

  private readonly nameErrors = signal<ValidationErrors | null | undefined>(
    this.nameControl.errors
  );

  protected readonly usernameError = computed(() => {
    const errors = this.nameErrors();
    if (!errors) return '';
    if (errors['required']) return 'Name is required.';
    if (errors['invalidPattern']) return 'Invalid username pattern.';
    return '';
  });

  private readonly emailErrors = signal<ValidationErrors | null | undefined>(
    this.emailControl.errors
  );

  protected readonly emailError = computed(() => {
    const errors = this.emailErrors();
    if (errors == null) return '';
    if (errors['required']) return 'Email is required.';
    if (errors['email']) return 'Invalid email.';
    if (errors['shouldBeUnique']) return 'Email is already registered.';
    return '';
  });

  protected resetForm() {
    this.registerForm.reset();
    this.registerForm.markAsPristine();
    this.registerForm.markAsUntouched();
  }
}
