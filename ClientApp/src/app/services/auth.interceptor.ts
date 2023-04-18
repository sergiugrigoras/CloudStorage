import { TokenModel } from './../interfaces/token.interface';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(public authService: AuthService) { }
    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        let token = this.authService.getJwtToken();
        if (token) {
            request = this.addToken(request, token);
        }

        return next.handle(request).pipe(catchError(error => {
            if (error instanceof HttpErrorResponse && error.status === 401 && !request.url.includes('api/token/revoke')) {
                return this.handle401Error(request, next);
            } else {
                return throwError(() => error);
            }
        }));
    }

    private handle401Error(request: HttpRequest<any>, next: HttpHandler) {

        if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.authService.refreshToken().pipe(
                switchMap((token: TokenModel) => {
                    this.isRefreshing = false;
                    this.refreshTokenSubject.next(token.accessToken);
                    return next.handle(this.addToken(request, token.accessToken));
                }));

        } else {
            return this.refreshTokenSubject.pipe(
                filter(token => token != null),
                take(1),
                switchMap(jwt => {
                    return next.handle(this.addToken(request, jwt));
                }));
        }
    }

    private addToken(request: HttpRequest<any>, token: string) {
        return request.clone({
            setHeaders: {
                'Authorization': `Bearer ${token}`
            }
        });
    }
}