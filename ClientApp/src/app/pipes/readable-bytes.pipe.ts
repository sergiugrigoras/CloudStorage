import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'readableBytes'
})
export class ReadableBytesPipe implements PipeTransform {

  transform(bytes: any, precision: number) {
    if (!bytes || bytes == 0)
      return '0B';
    else {
      let sizes: string[] = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      let i = Math.floor(Math.log(+bytes) / Math.log(1024));
      if (precision <= 0)
        return Math.ceil(+bytes / Math.pow(1024, i)).toFixed(precision) + ' ' + sizes[i];
      else
        return (+bytes / Math.pow(1024, i)).toFixed(precision) + ' ' + sizes[i];
    }
  }

}
