import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';

export class AppErrorHandler implements ErrorHandler {
    handleError(error: any): void {
        console.log(error);
    }

}