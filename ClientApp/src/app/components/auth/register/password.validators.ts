import { AbstractControl, ValidationErrors } from '@angular/forms';
export class PasswordValidators {
  static passwordsShouldMatch(control: AbstractControl): ValidationErrors | null {
    const pass = control.get('password')?.value;
    const confirmPass = control.get('confirmPassword')?.value;

    if (pass !== confirmPass) return { passwordsShouldMatch: true };

    return null;
  }
}
