import { TokenModel } from '../interfaces/token.interface';
import { UserModel } from '../interfaces/user.interface';
import { environment } from '../../environments/environment';
import { Injectable } from '@angular/core';
import {HttpClient, HttpErrorResponse, HttpHeaders, HttpParams} from '@angular/common/http';
import {  Observable, of, Subject, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

const ADMIN_ROLE = 'Admin';
const JWT_TOKEN = 'jwt';
const REFRESH_TOKEN = 'refreshToken';
const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}
const apiUrl: string = environment.baseUrl;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isUserLoggedInSubject: Subject<boolean> = new Subject();

  constructor(private http: HttpClient, private jwtHelper: JwtHelperService, private router: Router) { }

  checkUniqueLogin(login: string): Observable<boolean> {
    if (login.includes('@'))
      return this.http.post<boolean>(apiUrl + '/api/auth/check-unique', { email: login }, httpOptions);
    else
      return this.http.post<boolean>(apiUrl + '/api/auth/check-unique', { username: login }, httpOptions);
  }

  getUser(): string {
    const token = this.getJwtToken();
    if (token)
      return this.jwtHelper.decodeToken(token).unique_name;
    else
      return '';
  }
  getEmail(): string {
    const token = this.getJwtToken();
    if (token)
      return this.jwtHelper.decodeToken(token).email;
    else
      return '';
  }
  getRoles(): string | string[] {
    const token = this.getJwtToken();
    if (token)
      return this.jwtHelper.decodeToken(token).role;
    else
      return '';
  }

  isAdmin(): boolean {
    const token = this.getJwtToken();
    if (token) {
      const roles = this.jwtHelper.decodeToken(token).role;
      if (typeof roles === 'string')
        return roles === ADMIN_ROLE;
      if (Array.isArray(roles)) {
        return roles.includes(ADMIN_ROLE);
      }
    }

    return false;
  }

  loginWithPassword(user: UserModel): Observable<boolean> {
    return this.http.post<any>(apiUrl + '/api/auth/login', user)
      .pipe(
        tap(tokens => this.doLoginUser(tokens)),
        map(() => true),
      );
  }

  loginWithToken(tokens: TokenModel): Observable<boolean> {
    return of(tokens).pipe(
      tap(tokens => this.doLoginUser(tokens)),
      map(() => true),
    );
  }

  logout() {
    return this.http.delete(apiUrl + '/api/token/revoke').pipe(
      tap(() => this.doLogoutUser()),
      map(() => true),
      catchError(() => {
        this.doLogoutUser();
        return of(false);
      })
    );
  }

  register(user: UserModel, inviteCode: unknown) {
    let params = new HttpParams();
    if (typeof inviteCode === 'string') {
      params = params.set('inviteCode', inviteCode);
    }
    return this.http.post<TokenModel>(apiUrl + '/api/auth/register', user, {params: params, headers: {'Content-Type': 'application/json'}})
      .pipe(
        tap(tokens => this.doLoginUser(tokens)),
      );
  }

  isLoggedIn() {
    return !!this.getJwtToken();
  }

  refreshToken() {
    const credentials = JSON.stringify({ accessToken: this.getJwtToken(), refreshToken: this.getRefreshToken() });
    return this.http.post<TokenModel>(apiUrl + '/api/token/refresh', credentials, httpOptions).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 400) {
          this.doLogoutUser();
          void this.router.navigate(['/login']);
          return throwError(() => error)
        } else {
          return throwError(() => error);
        }
      }),
      tap((tokens: TokenModel) => {
        this.storeTokens(tokens);
      }));
  }

  getJwtToken() {
    return localStorage.getItem(JWT_TOKEN);
  }

  private doLoginUser(tokens: TokenModel) {
    this.isUserLoggedInSubject.next(true);
    this.storeTokens(tokens);
  }

  private doLogoutUser() {
    this.isUserLoggedInSubject.next(false);
    this.removeTokens();
  }


  private getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN);
  }

  private storeTokens(tokens: TokenModel) {
    localStorage.setItem(JWT_TOKEN, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN, tokens.refreshToken);
  }
  private removeTokens() {
    localStorage.removeItem(JWT_TOKEN);
    localStorage.removeItem(REFRESH_TOKEN);
  }
}
