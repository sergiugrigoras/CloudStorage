import { AccessToken, TokenType } from '../interfaces/token.interface';
import { UserModel } from '../interfaces/user.interface';
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { finalize, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { buildUrl } from '../core/url-builder';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';
import { JWT_KEY } from '../../main';
import { AppRoute } from '../interfaces/app-route.interface';
import { TwoFaKey } from '../interfaces/two-fa-key.interface';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly jwtHelper = inject(JwtHelperService);
  private readonly router = inject(Router);
  isUserLoggedIn = signal(false);
  isAdmin = computed(() => (this.isUserLoggedIn() ? this.tokenHasAdminRole() : false));
  appRoutes = computed(() =>
    this.isAdmin() ? [...this._defaultRoutes, this._adminRoute] : this._defaultRoutes
  );

  private readonly _defaultRoutes: readonly AppRoute[] = [
    { route: '/drive', displayName: 'Drive', icon: 'backup' },
    { route: '/media', displayName: 'Media', icon: 'image' },
    { route: '/notes', displayName: 'Notes', icon: 'edit_note' },
    { route: '/expenses', displayName: 'Expenses', icon: 'paid' },
  ];

  private readonly _adminRoute: AppRoute = {
    route: '/admin',
    displayName: 'Admin',
    icon: 'settings',
  };
  private readonly _adminRole = 'Admin';
  constructor() {}

  checkUniqueLogin(login: string): Observable<boolean> {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.CHECK_UNIQUE);
    const body = login.includes('@') ? { email: login } : { username: login };
    return this.http.post<boolean>(url, body, HTTP_OPTIONS_CONTENT_JSON);
  }

  loginWithPassword(user: UserModel): Observable<AccessToken> {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.LOGIN);
    return this.http.post<AccessToken>(url, user);
  }

  loginWithTwoFa(token: string, code: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.LOGIN_2FA);
    return this.http.post<AccessToken>(url, { token, code });
  }

  logout() {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.REVOKE);
    const body: AccessToken = {
      token: this.getJwtToken() ?? '',
      tokenType: TokenType.Authentication,
    };
    return this.http.delete(url, { body }).pipe(
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
      tokenType: TokenType.Authentication,
    };
    return this.http.post<AccessToken>(url, body, HTTP_OPTIONS_CONTENT_JSON).pipe(
      catchError((error) => {
        this.doLogoutUser();
        void this.router.navigate(['/login']);
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

  forgotPassword(email: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.FORGOT_PASSWORD);
    return this.http.post(url, { email }, HTTP_OPTIONS_CONTENT_JSON);
  }

  resetPassword(email: string, token: string, newPassword: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.RESET_PASSWORD);
    return this.http.post<AccessToken>(
      url,
      {
        email,
        token,
        newPassword,
      },
      HTTP_OPTIONS_CONTENT_JSON
    );
  }

  getUserNameFromJwtToken(): string {
    const token = this.getJwtToken();
    if (token) return this.jwtHelper.decodeToken(token).name;
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

  private tokenHasAdminRole(): boolean {
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

  loginUser(token: AccessToken) {
    this.doLoginUser(token);
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

  setupTwoFa() {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.SETUP_2FA);
    return this.http.post<TwoFaKey>(url, null, HTTP_OPTIONS_CONTENT_JSON);
  }

  toggleTwoFa(password: string, code: string) {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.TOGGLE_2FA);
    return this.http.post<boolean>(url, { password, code }, HTTP_OPTIONS_CONTENT_JSON);
  }

  isTwoFaEnabled() {
    const url = buildUrl(API_ENDPOINTS.AUTH.BASE, API_ENDPOINTS.AUTH.TWO_FA_ENABLED);
    return this.http.get<boolean>(url, HTTP_OPTIONS_CONTENT_JSON);
  }

  private doLoginUser(tokens: AccessToken) {
    this.storeToken(tokens);
    this.isUserLoggedIn.set(true);
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
