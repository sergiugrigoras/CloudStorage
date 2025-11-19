import { UserModel } from '../../../interfaces/user.interface';
import { AuthService } from '../../../services/auth.service';
import { PasswordValidators } from '../../../utils/password.validators';
import { Component, inject, OnInit } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { UsernameValidators } from '../../../utils/username.validators';
import { catchError, EMPTY } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormField, MatLabel, MatInput, MatSuffix, MatError } from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';
import { PasswordMismatchErrorStateMatcher } from '../../../utils/password-mismatch-error-state-matcher';

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
  ],
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly passwordMismatchErrorStateMatcher = new PasswordMismatchErrorStateMatcher();
  form = new FormGroup(
    {
      username: new FormControl(
        '',
        [Validators.required, UsernameValidators.checkPattern],
        UsernameValidators.checkUnique(this.authService)
      ),
      email: new FormControl(
        '',
        [Validators.required, Validators.email],
        UsernameValidators.checkUnique(this.authService)
      ),
      inviteCode: new FormControl(''),
      password: new FormControl('', Validators.required),
      confirmPassword: new FormControl('', Validators.required),
    },
    PasswordValidators.passwordsMismatch('password', 'confirmPassword')
  );

  constructor() {}

  ngOnInit(): void {
    const inviteCode = this.route.snapshot.queryParams['inviteCode'];
    const email = this.route.snapshot.queryParams['email'];
    if (inviteCode) {
      this.inviteCode?.setValue(inviteCode);
    }
    if (email) {
      this.email?.setValue(email);
    }
  }

  get password() {
    return this.form.get('password');
  }

  get confirmPassword() {
    return this.form.get('confirmPassword');
  }

  get email() {
    return this.form.get('email');
  }

  get username() {
    return this.form.get('username');
  }

  get inviteCode() {
    return this.form.get('inviteCode');
  }

  register() {
    const user: UserModel = {
      username: this.username?.value,
      email: this.email?.value,
      password: this.password?.value,
    };
    const inviteCode = (this.inviteCode?.value || '').trim();
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

  getUsernameError() {
    const errors = this.username?.errors;
    if (errors == null) return '';
    if (errors['required']) return 'Username is required.';
    if (errors['invalidPattern']) return 'Invalid username pattern.';
    if (errors['shouldBeUnique']) return 'Username is already taken.';
    return '';
  }

  getEmailError() {
    const errors = this.email?.errors;
    if (errors == null) return '';
    // console.log(errors);
    if (errors['required']) return 'Email is required.';
    if (errors['email']) return 'Invalid email.';
    if (errors['shouldBeUnique']) return 'Email is already registered.';
    return '';
  }
}
