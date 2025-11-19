import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { of, switchMap, timer } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export class UsernameValidators {
  static checkPattern(control: AbstractControl): ValidationErrors | null {
    const regex = /^[a-z][\w.-]{4,31}$/i;
    if (!(control.value as string)?.match(regex)) return { invalidPattern: true };
    return null;
  }

  static checkUnique(authService: AuthService): AsyncValidatorFn {
    return (control) => {
      const value = control.value;
      if (!value) return of(null);

      return timer(300).pipe(
        switchMap(() => authService.checkUniqueLogin(value)),
        map((isUnique) => (isUnique ? null : { shouldBeUnique: true })),
        catchError(() => of(null))
      );
    };
  }
}
