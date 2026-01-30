import { IStorageInfo } from '../interfaces/disk.interface';
import { IStorageNodeModel } from '../model/storage-node.model';
import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { buildUrl } from '../core/url-builder';
import { API_ENDPOINTS } from '../core/api-endpoints';
import { HTTP_OPTIONS_CONTENT_JSON } from '../core/constants';

@Injectable({
  providedIn: 'root',
})
export class DriveService {
  clipboard = signal<string[]>([]);
  private readonly http = inject(HttpClient);
  constructor() {}

  getNodes() {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.ROOT);
    return this.http.get<IStorageNodeModel[]>(url);
  }

  getStorageInfo() {
    const url = buildUrl(API_ENDPOINTS.STORAGE.BASE, API_ENDPOINTS.STORAGE.INFO);
    return this.http.get<IStorageInfo>(url);
  }

  addFolder(node: IStorageNodeModel) {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.ADD_FOLDER);
    return this.http.post<IStorageNodeModel>(url, node, HTTP_OPTIONS_CONTENT_JSON);
  }

  delete(ids: string[]) {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.DELETE);
    const options = {
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
      body: ids,
    };
    return this.http.delete(url, options);
  }

  move(nodeIds: string[], destinationNodeId: string | null) {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.MOVE);
    const options = {
      headers: HTTP_OPTIONS_CONTENT_JSON.headers,
    };
    return this.http.post<IStorageNodeModel[]>(url, { nodeIds, destinationNodeId }, options);
  }

  rename(node: IStorageNodeModel) {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.RENAME);
    return this.http.put<IStorageNodeModel>(url, node, HTTP_OPTIONS_CONTENT_JSON);
  }

  upload(formData: FormData) {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.UPLOAD);
    return this.http.post(url, formData, {
      observe: 'events',
      reportProgress: true,
    });
  }

  download(nodeIds: string[]) {
    const url = buildUrl(API_ENDPOINTS.STORAGE_NODE.BASE, API_ENDPOINTS.STORAGE_NODE.DOWNLOAD);

    return this.http.post<Blob>(
      url,
      { nodeIds },
      {
        observe: 'events',
        reportProgress: true,
        responseType: 'blob' as 'json',
        headers: HTTP_OPTIONS_CONTENT_JSON.headers,
      }
    );
  }
}
