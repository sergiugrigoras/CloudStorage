import { AbstractControl, ControlContainer, ValidationErrors } from '@angular/forms';
export class PasswordValidators {

    static passwordsShouldMatch(control: AbstractControl): ValidationErrors | null {
        let pass = control.get('password')?.value;
        let confirmPass = control.get('confirmPassword')?.value;

        if (pass !== confirmPass)
            return { passwordsShouldMatch: true };

        return null;
    }
}