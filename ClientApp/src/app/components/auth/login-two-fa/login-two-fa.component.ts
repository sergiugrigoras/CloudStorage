import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { EMPTY, filter, from, map, Subject, takeUntil } from 'rxjs';
import { MatInput, MatLabel, MatFormField } from '@angular/material/input';
import { NgxMaskDirective } from 'ngx-mask';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login-two-fa',
  imports: [MatFormField, MatInput, MatLabel, NgxMaskDirective, ReactiveFormsModule],
  templateUrl: './login-two-fa.component.html',
  styleUrl: './login-two-fa.component.scss',
})
export class LoginTwoFaComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly authService = inject(AuthService);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  @Input() navigate: string = '/';
  @Input() token: string | null = null;

  totpControl = new FormControl('', [
    Validators.required,
    Validators.minLength(6),
    Validators.maxLength(6),
  ]);

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.totpControl.statusChanges
      .pipe(
        takeUntil(this.destroy$),
        filter((status) => status === 'VALID'),
        map(() => this.totpControl.value || ''),
        filter((value) => value.length === 6),
        distinctUntilChanged(),
        switchMap((value) => this.loginTwoFa(this.token || '', value))
      )
      .subscribe();
  }

  loginTwoFa(token: string, code: string) {
    return this.authService.loginWithTwoFa(token, code).pipe(
      catchError((error: unknown) => {
        let message = 'An error occurred.';
        if (error instanceof HttpErrorResponse && typeof error.error === 'string') {
          message = error.error;
        }
        this._snackBar.open(message, 'Ok', { duration: 5000 });
        return EMPTY;
      }),
      tap((token) => {
        this.authService.loginUser(token);
      }),
      switchMap(() => from(this.router.navigate([this.navigate])))
    );
  }
}
