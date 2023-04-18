import { TokenModel } from './../interfaces/token.interface';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { UserModel } from '../interfaces/user.interface';

const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}
const apiUrl: string = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class PasswordService {

  constructor(private http: HttpClient) { }

  changePassword(oldPassword: string, newPassword: string) {
    return this.http.post(apiUrl + '/api/password/change', {
      oldPassword,
      newPassword
    }, httpOptions)
  }

  sendResetToken(identifier: string) {
    let user: UserModel = {
      username: String(identifier).includes('@') ? '' : identifier,
      email: String(identifier).includes('@') ? identifier : '',
      password: ''
    };
    return this.http.post<string>(apiUrl + '/api/password/token', user, httpOptions);
  }

  resetPassword(tokenId: number, token: string, newPassword: string) {
    return this.http.post<TokenModel>(apiUrl + '/api/password/reset', {
      tokenId,
      token,
      newPassword
    }, httpOptions);
  }
}
