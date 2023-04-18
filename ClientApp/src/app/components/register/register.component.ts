import { UserModel } from './../../interfaces/user.interface';
import { AuthService } from './../../services/auth.service';
import { PasswordValidators } from './password.validators';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { UsernameValidators } from './username.validators';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  form = new FormGroup({
    username: new FormControl('', [Validators.required, UsernameValidators.checkPattern], this.shouldBeUnique.bind(this)),
    email: new FormControl('', [Validators.required, Validators.email], this.shouldBeUnique.bind(this)),
    password: new FormControl('', Validators.required),
    confirmPassword: new FormControl('', Validators.required),
  }, PasswordValidators.passwordsShouldMatch);

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
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

  register() {
    let user: UserModel = {
      username: this.username?.value,
      email: this.email?.value,
      password: this.password?.value
    };
    this.authService.register(user).subscribe(res => {
      if (res)
        this.router.navigate(['/']);
    });
  }

  shouldBeUnique(control: AbstractControl): Observable<ValidationErrors | null> {
    return this.authService.checkUniqueLogin(control.value)
      .pipe(map(result => {
        if (result) return null;
        else return { shouldBeUnique: true }
      }));
  }

  getUsernameError() {
    const errors = this.username.errors;
    if (errors == null) return '';
    if (errors['required']) return 'Username is required.';
    if (errors['invalidPattern']) return 'Invalid username pattern.'
    if (errors['shouldBeUnique']) return 'Username is already taken.'
    return '';
  }

  getEmailError() {
    const errors = this.email.errors;
    if (errors == null) return '';
    // console.log(errors);
    if (errors['required']) return 'Email is required.';
    if (errors['email']) return 'Invalid email.'
    if (errors['shouldBeUnique']) return 'Email is already registered.'
    return '';
  }
}
