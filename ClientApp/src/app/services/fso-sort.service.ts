import { Injectable } from '@angular/core';
import { FsoModel } from '../interfaces/fso.interface';

@Injectable({
  providedIn: 'root'
})
export class FsoSortService {

  sortByNameAscFn = (first: FsoModel, second: FsoModel) => {
    let isFirstFolder = first.isFolder;
    let isSecondFolder = second.isFolder;
    let firstIsLessThanSecond = -1;
    let firstIsGreaterThanSecond = 1;
    if (isFirstFolder && isSecondFolder)
      return first.name.localeCompare(second.name);
    else if (isFirstFolder || isSecondFolder)
      return (isFirstFolder) ? firstIsLessThanSecond : firstIsGreaterThanSecond;
    return first.name.localeCompare(second.name);
  }

  sortByNameDescFn = (first: FsoModel, second: FsoModel) => {
    const isFirstFolder = first.isFolder;
    const isSecondFolder = second.isFolder;
    const firstIsLessThanSecond = -1;
    const firstIsGreaterThanSecond = 1;
    if (isFirstFolder && isSecondFolder)
      return second.name.localeCompare(first.name);
    else if (isFirstFolder || isSecondFolder)
      return (isFirstFolder) ? firstIsGreaterThanSecond : firstIsLessThanSecond;
    return second.name.localeCompare(first.name);
  }

  sortBySizeAscFn = (first: FsoModel, second: FsoModel) => {
    const isFirstFolder = first.isFolder;
    const isSecondFolder = second.isFolder;
    const firstIsLessThanSecond = -1;
    const firstIsGreaterThanSecond = 1;
    if (isFirstFolder && isSecondFolder)
      return first.name.localeCompare(second.name);
    else if (isFirstFolder || isSecondFolder)
      return (isFirstFolder) ? firstIsLessThanSecond : firstIsGreaterThanSecond;
    return (first.fileSize! > second.fileSize!) ? firstIsGreaterThanSecond : firstIsLessThanSecond;
  }

  sortBySizeDescFn = (first: FsoModel, second: FsoModel) => {
    const isFirstFolder = first.isFolder;
    const isSecondFolder = second.isFolder;
    const firstIsLessThanSecond = -1;
    const firstIsGreaterThanSecond = 1;
    if (isFirstFolder && isSecondFolder)
      return first.name.localeCompare(second.name);
    else if (isFirstFolder || isSecondFolder)
      return (isFirstFolder) ? firstIsGreaterThanSecond : firstIsLessThanSecond;
    return (first.fileSize! > second.fileSize!) ? firstIsLessThanSecond : firstIsGreaterThanSecond;
  }

  sortByDateAscFn = (first: FsoModel, second: FsoModel) => {
    const isFirstFolder = first.isFolder;
    const isSecondFolder = second.isFolder;
    const firstIsLessThanSecond = -1;
    const firstIsGreaterThanSecond = 1;
    if (isFirstFolder && isSecondFolder)
      return (first.date! > second.date!) ? firstIsGreaterThanSecond : firstIsLessThanSecond
    else if (isFirstFolder || isSecondFolder)
      return (isFirstFolder) ? firstIsLessThanSecond : firstIsGreaterThanSecond;
    return (first.date! > second.date!) ? firstIsGreaterThanSecond : firstIsLessThanSecond;
  }

  sortByDateDescFn = (first: FsoModel, second: FsoModel) => {
    const isFirstFolder = first.isFolder;
    const isSecondFolder = second.isFolder;
    const firstIsLessThanSecond = -1;
    const firstIsGreaterThanSecond = 1;
    if (isFirstFolder && isSecondFolder)
      return (first.date! > second.date!) ? firstIsLessThanSecond : firstIsGreaterThanSecond
    else if (isFirstFolder || isSecondFolder)
      return (isFirstFolder) ? firstIsGreaterThanSecond : firstIsLessThanSecond;
    return (first.date! > second.date!) ? firstIsLessThanSecond : firstIsGreaterThanSecond;
  }
}
