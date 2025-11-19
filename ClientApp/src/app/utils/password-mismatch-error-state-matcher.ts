import { ErrorStateMatcher } from '@angular/material/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';

export class PasswordMismatchErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    const passwordsMismatch = !!form?.errors?.['passwordsMismatch'];
    const valueRequired = !!control?.errors?.['required'];
    const dirty = !!control?.dirty;
    const touched = !!control?.touched;
    return (dirty || touched) && (passwordsMismatch || valueRequired);
  }
}
