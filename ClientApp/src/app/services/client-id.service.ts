import { Injectable } from '@angular/core';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

@Injectable({
  providedIn: 'root',
})
export class ClientIdService {
  private readonly _clientId: string;
  private readonly _clientIdKey = 'client-id';

  constructor() {
    this._clientId = this.initClientId();
  }

  private initClientId() {
    const clientId = localStorage.getItem(this._clientIdKey);
    if (typeof clientId === 'string' && uuidValidate(clientId)) {
      return clientId;
    }

    const newId = uuidv4();
    localStorage.setItem(this._clientIdKey, newId);
    return newId;
  }

  getClientId() {
    return this._clientId;
  }
}
