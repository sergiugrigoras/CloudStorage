import { Injectable } from '@angular/core';
import {environment} from "../../environments/environment";
import {HttpClient, HttpParams} from "@angular/common/http";
import {User} from "../model/user.model";
const API_URL: string = environment.baseUrl;
const HTTP_OPTIONS = {
  headers: { 'Content-Type': 'application/json' }
}
@Injectable({
  providedIn: 'root'
})
export class AdminService {
  constructor(private http: HttpClient) { }

  getAllUsers() {
    return this.http.get<User[]>(`${API_URL}/api/admin/users`, HTTP_OPTIONS)
  }

  toggleAccount(user: User) {
    return this.http.patch<User>(`${API_URL}/api/admin/user`, user, HTTP_OPTIONS)
  }

  sendInviteCode(email: string) {
    const params = new HttpParams().set('email', email);
    const options = {
      ...HTTP_OPTIONS,
      params: params
    };
    return this.http.post(`${API_URL}/api/admin/invite`, null, options)
  }
}
