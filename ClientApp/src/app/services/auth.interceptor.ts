import { AccessToken } from '../interfaces/token.interface';
import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, throwError } from 'rxjs';
import { catchError, switchMap, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private newAccessTokenSubject = new ReplaySubject<string>(1);
  private readonly _anonymousEndpoints = [
    buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.LOGIN),
    buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REGISTER),
    buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REFRESH),
    buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.CHECK_UNIQUE),
    buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.FORGOT_PASSWORD),
    buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.RESET_PASSWORD),
  ];
  private readonly _revokeEndpoint = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REVOKE);
  constructor(public authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getJwtToken();
    if (token && this.shouldAttachToken(request.url)) {
      request = this.addTokenToRequest(request, token);
    }

    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 && !request.url.includes(this._revokeEndpoint)) {
          return this.handle401Error(request, next);
        }

        return throwError(() => error);
      })
    );
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler) {
    if (!this.isRefreshing) {
      this.isRefreshing = true;

      return this.authService.refreshToken().pipe(
        catchError((err) => {
          this.isRefreshing = false;
          this.authService.logoutUser();
          return throwError(() => err);
        }),
        switchMap((token: AccessToken) => {
          this.isRefreshing = false;
          this.newAccessTokenSubject.next(token.token);
          return next.handle(this.addTokenToRequest(request, token.token));
        })
      );
    } else {
      return this.newAccessTokenSubject.pipe(
        take(1),
        switchMap((token) => next.handle(this.addTokenToRequest(request, token)))
      );
    }
  }

  private addTokenToRequest(request: HttpRequest<any>, token: string) {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private shouldAttachToken(url: string) {
    return !this._anonymousEndpoints.some((x) => url.includes(x));
  }
}
