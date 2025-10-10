import {environment} from "../../environments/environment";

export function buildUrl(...paths: string[]) {
  return [environment.apiUrl, ...paths].join('/');
}
