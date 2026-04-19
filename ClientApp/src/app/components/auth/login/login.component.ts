import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal, WritableSignal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { catchError, switchMap } from 'rxjs/operators';
import { EMPTY, from } from 'rxjs';
import { TokenType } from '../../../interfaces/token.interface';
import { LoginTwoFaComponent } from '../login-two-fa/login-two-fa.component';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    RouterLink,
    LoginTwoFaComponent,
    MatError,
  ],
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly _snackBar = inject(MatSnackBar);
  protected readonly twoFaToken: WritableSignal<string | null> = signal(null);
  returnUrl: string = '';

  protected readonly emailControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly passwordControl = new FormControl('', {
    nonNullable: true,
    validators: Validators.required,
  });
  loginForm = new FormGroup({
    email: this.emailControl,
    password: this.passwordControl,
  });

  constructor() {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  login() {
    if (this.loginForm.invalid || this.loginForm.pending) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const payload = {
      email: this.emailControl.value,
      password: this.passwordControl.value,
    };
    this.authService
      .loginWithPassword(payload)
      .pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            switch (error.status) {
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
        switchMap((token) => {
          if (token.tokenType === TokenType.Authentication) {
            this.authService.loginUser(token);
            return from(this.router.navigate([this.returnUrl]));
          }
          if (token.tokenType === TokenType.TwoFactorAuthentication) {
            this.twoFaToken.set(token.token);
          }
          return EMPTY;
        })
      )
      .subscribe();
  }
}
