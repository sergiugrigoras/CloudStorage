import { AbstractControl, ControlContainer, ValidationErrors } from '@angular/forms';
export class PasswordValidators {

    static passwordsShouldMatch(control: AbstractControl): ValidationErrors | null {
        let newPass = control.get('newPassword')?.value;
        let confirmNewPass = control.get('confirmNewPassword')?.value;

        if (newPass !== confirmNewPass)
            return { passwordsShouldMatch: true };
        return null;
    }
}