import { AccessToken } from '../interfaces/token.interface';
import { UserModel } from '../interfaces/user.interface';
import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { finalize, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { buildUrl } from '../core/url-builder';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';
import { JWT_KEY } from '../../main';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly jwtHelper = inject(JwtHelperService);
  private readonly router = inject(Router);
  isUserLoggedIn = signal(false);
  private readonly _adminRole = 'Admin';
  constructor() {}

  checkUniqueLogin(login: string): Observable<boolean> {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.CHECK_UNIQUE);
    const body = login.includes('@') ? { email: login } : { username: login };
    return this.http.post<boolean>(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

  loginWithPassword(user: UserModel): Observable<boolean> {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.LOGIN);
    return this.http.post<AccessToken>(url, user).pipe(
      tap((token) => this.doLoginUser(token)),
      map(() => true)
    );
  }

  loginWithToken(token: AccessToken): Observable<boolean> {
    return of(token).pipe(
      tap((token) => this.doLoginUser(token)),
      map(() => true)
    );
  }

  logout() {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REVOKE);
    return this.http.delete(url).pipe(
      finalize(() => {
        this.doLogoutUser();
        void this.router.navigate(['/']);
      })
    );
  }

  register(user: UserModel, inviteCode: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REGISTER);
    const options = {
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
      params: new HttpParams().set('inviteCode', inviteCode),
    };
    return this.http
      .post<AccessToken>(url, user, options)
      .pipe(tap((token) => this.doLoginUser(token)));
  }

  refreshToken() {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REFRESH);
    const body: AccessToken = {
      token: this.getJwtToken() ?? '',
    };
    return this.http.post<AccessToken>(url, body, HTTP_OPTIONS_CONTENT_JSON).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 400) {
          this.doLogoutUser();
          void this.router.navigate(['/login']);
        }
        return throwError(() => error);
      }),
      tap((token: AccessToken) => {
        this.storeToken(token);
      })
    );
  }

  // Password
  changePassword(oldPassword: string, newPassword: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.CHANGE_PASSWORD);
    const body = {
      oldPassword,
      newPassword,
    };
    return this.http.post(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

  forgotPassword(identifier: string) {
    const body: UserModel = {
      username: String(identifier).includes('@') ? '' : identifier,
      email: String(identifier).includes('@') ? identifier : '',
      password: '',
    };
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.FORGOT_PASSWORD);
    return this.http.post<string>(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

  resetPassword(tokenId: number, token: string, newPassword: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.RESET_PASSWORD);
    return this.http.post<AccessToken>(
      url,
      {
        tokenId,
        token,
        newPassword,
      },
      HTTP_OPTIONS_CONTENT_JSON
    );
  }

  getUserNameFromJwtToken(): string {
    const token = this.getJwtToken();
    if (token) return this.jwtHelper.decodeToken(token).unique_name;
    else return '';
  }

  getEmailFromJwtToken(): string {
    const token = this.getJwtToken();
    if (token) return this.jwtHelper.decodeToken(token).email;
    else return '';
  }

  getRolesFromJwtToken(): string | string[] {
    const token = this.getJwtToken();
    if (token) return this.jwtHelper.decodeToken(token).role;
    else return '';
  }

  isAdmin(): boolean {
    const token = this.getJwtToken();
    if (token) {
      const roles = this.jwtHelper.decodeToken(token).role;
      if (typeof roles === 'string') return roles === this._adminRole;
      if (Array.isArray(roles)) {
        return roles.includes(this._adminRole);
      }
    }

    return false;
  }

  logoutUser() {
    this.doLogoutUser();
  }
  getJwtToken() {
    return localStorage.getItem(JWT_KEY);
  }

  jwtTokenExists() {
    return !!this.getJwtToken();
  }

  private doLoginUser(tokens: AccessToken) {
    this.isUserLoggedIn.set(true);
    this.storeToken(tokens);
  }

  private doLogoutUser() {
    this.isUserLoggedIn.set(false);
    this.removeToken();
  }

  private storeToken(token: AccessToken) {
    localStorage.setItem(JWT_KEY, token.token);
  }
  private removeToken() {
    localStorage.removeItem(JWT_KEY);
  }
}
