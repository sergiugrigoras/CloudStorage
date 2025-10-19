import { AbstractControl, ValidationErrors } from '@angular/forms';

export class UsernameValidators {
  static checkPattern(control: AbstractControl): ValidationErrors | null {
    const regex = /^[a-z][\w.-]{4,31}$/i;
    if (!(control.value as string)?.match(regex)) return { invalidPattern: true };
    return null;
  }
}
