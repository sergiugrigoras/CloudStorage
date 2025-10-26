import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { User } from '../model/user.model';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';
import { IStorageInfo } from '../interfaces/disk.interface';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly http = inject(HttpClient);
  constructor() {}

  getAllUsers() {
    const url = buildUrl(API_ENDPOINTS.ADMIN.BASE, API_ENDPOINTS.ADMIN.ALL_USERS);
    return this.http.get<User[]>(url, HTTP_OPTIONS_CONTENT_JSON);
  }

  toggleAccount(user: User) {
    const url = buildUrl(API_ENDPOINTS.ADMIN.BASE, API_ENDPOINTS.ADMIN.UPDATE_USER);
    return this.http.patch<User>(url, user, HTTP_OPTIONS_CONTENT_JSON);
  }

  sendInviteCode(email: string) {
    const url = buildUrl(API_ENDPOINTS.ADMIN.BASE, API_ENDPOINTS.ADMIN.INVITE_USER);
    const options = {
      params: new HttpParams().set('email', email),
    };
    return this.http.post(url, null, options);
  }

  getStorageInfo(id: string) {
    const url = buildUrl(API_ENDPOINTS.STORAGE.BASE, API_ENDPOINTS.STORAGE.USER_INFO);
    const options = {
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
      params: new HttpParams().set('id', id),
    };
    return this.http.get<IStorageInfo>(url, options);
  }
}
