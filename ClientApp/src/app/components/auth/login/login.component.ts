import { HttpErrorResponse } from '@angular/common/http';
import { UserModel } from '../../../interfaces/user.interface';
import { Component, inject, OnInit, signal } from '@angular/core';
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
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { EMPTY, from } from 'rxjs';
import { TokenType } from '../../../interfaces/token.interface';
import { NgxMaskDirective } from 'ngx-mask';

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
    NgxMaskDirective,
  ],
})
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly _snackBar = inject(MatSnackBar);
  protected readonly require2Fa = signal(false);
  returnUrl: string = '';
  form = new FormGroup({
    userIdentifier: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  twoFaForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.minLength(6),
      Validators.maxLength(6),
    ]),
    token: new FormControl('', Validators.required),
  });

  constructor() {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  login() {
    const identifier = this.form.get('userIdentifier')?.value;
    const user: UserModel = {
      username: String(identifier).includes('@') ? '' : identifier,
      email: String(identifier).includes('@') ? identifier : '',
      password: this.form.get('password')?.value,
    };

    this.authService
      .loginWithPassword(user)
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
          } else if (token.tokenType === TokenType.TwoFactorAuthentication) {
            this.require2Fa.set(true);
            this.twoFaForm.get('token')?.setValue(token.token);
          }
          return EMPTY;
        })
      )
      .subscribe();
  }

  loginTwoFa() {
    const token = this.twoFaForm.get('token')?.value;
    const code = (this.twoFaForm.get('code')?.value || '').trim();
    if (token == null || code === '') return;

    this.authService
      .loginWithTwoFa(token, code)
      .pipe(
        catchError(() => {
          // TODO switch error status
          this._snackBar.open(`An error occurred.`, 'Ok', { duration: 5000 });
          return EMPTY;
        }),
        tap((token) => {
          this.authService.loginUser(token);
          this.require2Fa.set(false);
          this.twoFaForm.reset({ token: '', code: '' });
        }),
        switchMap(() => from(this.router.navigate([this.returnUrl])))
      )
      .subscribe();
  }
}
