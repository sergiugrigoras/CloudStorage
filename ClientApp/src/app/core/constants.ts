import {HttpHeaders} from "@angular/common/http";

export const HTTP_OPTIONS_CONTENT_JSON = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json'
  })
}
