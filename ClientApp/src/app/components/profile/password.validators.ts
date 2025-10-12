import { AbstractControl, ValidationErrors } from '@angular/forms';
export class PasswordValidators {
  static passwordsShouldMatch(control: AbstractControl): ValidationErrors | null {
    const newPass = control.get('newPassword')?.value;
    const confirmNewPass = control.get('confirmNewPassword')?.value;

    if (newPass !== confirmNewPass) return { passwordsShouldMatch: true };
    return null;
  }
}
