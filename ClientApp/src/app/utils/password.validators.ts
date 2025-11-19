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

  static strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const lower = /[a-z]/;
    const upper = /[A-Z]/;
    const digit = /\d/;
    const symbol = /[^A-Za-z0-9]/;
    const minLength = 8;

    const value = control.value as string;
    if (!value) return null;

    const errors: ValidationErrors = {};

    if (value.length < minLength) errors['minLength'] = true;
    if (!lower.test(value)) errors['lowercase'] = true;
    if (!upper.test(value)) errors['uppercase'] = true;
    if (!digit.test(value)) errors['digit'] = true;
    if (!symbol.test(value)) errors['symbol'] = true;

    return Object.keys(errors).length ? errors : null;
  }

  public static readonly strongPasswordTooltip = `Password must be at least 8 characters and include:
• One lowercase letter
• One uppercase letter
• One digit
• One symbol`;
}
