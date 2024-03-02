import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/app/services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PasswordService } from 'src/app/services/password.service';
import { PasswordValidators } from '../profile/password.validators';
import { EMPTY, throwError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss']
})
export class ResetPasswordComponent implements OnInit {

  resetToken = '';
  resetTokenId = '';
  passwordError = '';
  passwordSuccess = '';

  userIdentifierForm = new FormGroup({
    userIdentifier: new FormControl('', Validators.required),
  });

  passwordForm = new FormGroup({
    newPassword: new FormControl('', Validators.required),
    confirmNewPassword: new FormControl('', Validators.required),
  }, PasswordValidators.passwordsShouldMatch);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private passwordService: PasswordService,
    private authService: AuthService,
    private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.resetToken = this.route.snapshot.queryParams['token'];
    this.resetTokenId = this.route.snapshot.queryParams['id'];
  }

  getResetToken() {
    this.passwordService.sendResetToken(this.userIdentifierForm.get('userIdentifier')?.value)
      .subscribe({
        next: (response) => {
          debugger;
          this.userIdentifierForm.reset();
          this._snackBar.open(`Instruction sent to ${response}`, 'Ok', { duration: 5000 });
        },
        error: error => {
          this.userIdentifierForm.reset();
          if (error instanceof HttpErrorResponse)
            this._snackBar.open(`User not found.`, 'Ok', { duration: 5000 });
        }
      });
  }

  resetPassword() {
    this.passwordService.resetPassword(+this.resetTokenId, this.resetToken, this.newPassword?.value)
      .pipe(
        catchError(error => {
          this._snackBar.open(`Invalid reset token.`, 'Ok', { duration: 5000 });
          this.passwordForm.reset();
          return EMPTY;
        }),
        switchMap(tokens => {
          return this.authService.loginWithToken(tokens);
        })
      )
      .subscribe(res => {
        if (res) {
          this._snackBar.open(`Password has been changed successfully.`, 'Ok', { duration: 3000 });
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 3000);
        }
      });


  }

  get newPassword() {
    return this.passwordForm.get('newPassword');
  }

  get confirmNewPassword() {
    return this.passwordForm.get('confirmNewPassword');
  }

}
