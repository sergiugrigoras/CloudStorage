import {HttpErrorResponse} from '@angular/common/http';
import {UserModel} from '../../interfaces/user.interface';
import {Component, OnInit} from '@angular/core';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {AuthService} from 'src/app/services/auth.service';
import {ActivatedRoute, Router} from '@angular/router';
import {MatSnackBar} from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit {
  badLogin: boolean = false;
  returnUrl: string = '';
  form = new FormGroup({
    userIdentifier: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
  });

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private _snackBar: MatSnackBar) {
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  login() {
    let identifier = this.form.get('userIdentifier')?.value;
    let user: UserModel = {
      username: String(identifier).includes('@') ? '' : identifier,
      email: String(identifier).includes('@') ? identifier : '',
      password: this.form.get('password')?.value
    };

    this.authService.loginWithPassword(user).subscribe({
      next: (res: boolean) => {
        if (res) {
          void this.router.navigate([this.returnUrl]);
        }
      },
      error: (error: any) => {
        if (error instanceof HttpErrorResponse) {
          switch (error.status) {
            case 400:
              this._snackBar.open(`${error.error}`, 'Ok', {duration: 5000});
              break;
            default:
              this._snackBar.open(`An error occurred.`, 'Ok', {duration: 5000});
              break;
          }
        }
      }
    });
  }

}
