import { UserModel } from '../../../interfaces/user.interface';
import { AuthService } from '../../../services/auth.service';
import { PasswordValidators } from './password.validators';
import { Component, inject, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { UsernameValidators } from './username.validators';
import { catchError, EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import {
  MatFormField,
  MatLabel,
  MatInput,
  MatSuffix,
  MatError,
  MatHint,
} from '@angular/material/input';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';

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
    MatHint,
    MatButton,
  ],
})
export class RegisterComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  form = new FormGroup(
    {
      username: new FormControl(
        '',
        [Validators.required, UsernameValidators.checkPattern],
        this.shouldBeUnique.bind(this)
      ),
      email: new FormControl(
        '',
        [Validators.required, Validators.email],
        this.shouldBeUnique.bind(this)
      ),
      inviteCode: new FormControl(''),
      password: new FormControl('', Validators.required),
      confirmPassword: new FormControl('', Validators.required),
    },
    PasswordValidators.passwordsShouldMatch
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

  shouldBeUnique(control: AbstractControl): Observable<ValidationErrors | null> {
    return this.authService.checkUniqueLogin(control.value).pipe(
      map((result) => {
        if (result) return null;
        else return { shouldBeUnique: true };
      })
    );
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
