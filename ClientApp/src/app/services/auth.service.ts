import { TokenModel } from './../interfaces/token.interface';
import { UserModel } from './../interfaces/user.interface';
import { environment } from './../../environments/environment';
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { interval, Observable, of, Subject, throwError } from 'rxjs';
import { catchError, debounceTime, map, mapTo, retry, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';



const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}
const apiUrl: string = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  isUserLoggedInSubject: Subject<boolean> = new Subject();
  private readonly JWT_TOKEN = 'jwt';
  private readonly REFRESH_TOKEN = 'refreshToken';
  private loggedUser: string = '';

  constructor(private http: HttpClient, private jwtHelper: JwtHelperService, private router: Router) { }

  checkUniqueLogin(login: string): Observable<boolean> {
    if (login.includes('@'))
      return this.http.post<boolean>(apiUrl + '/api/auth/checkunique', { email: login }, httpOptions);
    else
      return this.http.post<boolean>(apiUrl + '/api/auth/checkunique', { username: login }, httpOptions);
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

  login(user: UserModel): Observable<boolean> {
    return this.http.post<any>(apiUrl + '/api/auth/login', user)
      .pipe(
        tap(tokens => this.doLoginUser(user.username, tokens)),
        mapTo(true),
      );
  }

  loginWithToken(tokens: TokenModel): Observable<boolean> {
    return of(tokens).pipe(
      tap(tokens => this.doLoginUser(this.jwtHelper.decodeToken(tokens.accessToken).unique_name, tokens)),
      mapTo(true),
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

  register(user: UserModel) {
    return this.http.post<TokenModel>(apiUrl + '/api/auth/register', user, httpOptions)
      .pipe(
        tap(tokens => this.doLoginUser(user.username, tokens)),
        map(() => true),
        catchError(error => {
          console.error(error);
          return of(false);
        })
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
          this.router.navigate(['/login']);
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
    return localStorage.getItem(this.JWT_TOKEN);
  }

  private doLoginUser(username: string, tokens: TokenModel) {
    this.isUserLoggedInSubject.next(true);
    this.loggedUser = username;
    this.storeTokens(tokens);
  }

  private doLogoutUser() {
    this.isUserLoggedInSubject.next(false);
    this.loggedUser = '';
    this.removeTokens();
  }


  private getRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN);
  }

  private storeTokens(tokens: TokenModel) {
    localStorage.setItem(this.JWT_TOKEN, tokens.accessToken);
    localStorage.setItem(this.REFRESH_TOKEN, tokens.refreshToken);
  }
  private removeTokens() {
    localStorage.removeItem(this.JWT_TOKEN);
    localStorage.removeItem(this.REFRESH_TOKEN);
  }
}
