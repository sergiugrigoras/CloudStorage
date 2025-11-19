import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class PasswordValidators {
  static passwordsMismatch(
    firstPasswordControlName: string,
    secondPasswordControlName: string
  ): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const pass = control.get(firstPasswordControlName)?.value;
      const confirmPass = control.get(secondPasswordControlName)?.value;

      if (pass !== confirmPass) return { passwordsMismatch: true };

      return null;
    };
  }
}
