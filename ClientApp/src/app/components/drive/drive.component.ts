import { FsoSortService } from '../../services/fso-sort.service';
import { DiskInfoModel } from '../../interfaces/disk.interface';
import {catchError, switchMap, distinctUntilChanged, first} from 'rxjs/operators';
import {Subscription, EMPTY, Subject, forkJoin, Observable, map, debounceTime, of} from 'rxjs';
import {HttpErrorResponse, HttpEvent, HttpEventType} from '@angular/common/http';
import {FsoModel, FsoTouchHelper} from '../../model/fso.model';
import { DriveService } from '../../services/drive.service';
import { Component, ElementRef, OnInit, TemplateRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  ValidationErrors,
  ValidatorFn,
  Validators
} from "@angular/forms";

const SNACKBAR_OPTIONS = { duration: 3000 };
const DOUBLE_CLICK_THRESHOLD = 300;
@Component({
  selector: 'app-drive',
  templateUrl: './drive.component.html',
  styleUrls: ['./drive.component.scss'],
})
export class DriveComponent implements OnInit, OnDestroy {
  private readonly DEFAULT_SORT = this.fsoSortService.sortByNameAscFn;
  currentFolder: FsoModel;
  pageIsReady = false;
  focusIndex = 0;
  forbiddenChar: string[];
  progressBar = 0;
  @ViewChild('newFolderDialog', { static: true }) newFolderDialog: TemplateRef<any>;
  @ViewChild('renameDialog') renameDialog: TemplateRef<any>;
  @ViewChild('deleteConfirmDialog') deleteConfirmDialog: TemplateRef<any>;
  @ViewChild('inputFiles') inputFiles: ElementRef<HTMLInputElement>;
  @ViewChild('loading', { static: true }) spinnerTemplate: TemplateRef<any>;
  private sorter: Subject<any> = new Subject<any>();
  private sortedBy = this.DEFAULT_SORT;
  subscriptions = new Subscription();
  private touchTime: any = {};
  diskInfo: DiskInfoModel;
  newFolderControl = new FormControl('', [Validators.required, this.noForbiddenCharactersValidator() ], this.uniqueFolderNameAsyncValidator());
  renameControl = new FormControl('', Validators.required);
  constructor(
    private fsoSortService: FsoSortService,
    private driveService: DriveService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
  ) {
    this.forbiddenChar = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    for (let i = 0; i <= 31; i++) {
      this.forbiddenChar.unshift(String.fromCharCode(i));
    }
    this.forbiddenChar.unshift(String.fromCharCode(127));
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  ngOnInit() {
    const openFolderSubscription = this.driveService.openFolder$.subscribe(id => {
      this.openFolder(id, true);
    });
    this.subscriptions.add(openFolderSubscription);

    forkJoin([
      this.driveService.getDiskInfo(),
      this.driveService.getUserRoot()
    ]).subscribe({
      next: result => {
        this.currentFolder = new FsoModel(result[1]);
        this.sortItems();
        this.diskInfo = result[0];
        this.pageIsReady = true;
      },
      error: () => {
        this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      }
    })

    const sorterSubscription = this.sorter.subscribe((sortFn) => {
      this.currentFolder.children.sort(sortFn);
      this.sortedBy = sortFn;
    });
    this.subscriptions.add(sorterSubscription);
  }

  uniqueFolderNameAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl<string>): Observable<ValidationErrors | null> => control.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap(value => this.driveService.uniqueName(value, this.currentFolder.id, true)),
        catchError(() => of(false)),
        map((unique: boolean) => (unique ? null : {nameNotUnique: true})),
        first()
      );
  }

  noForbiddenCharactersValidator(): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      if (this.forbiddenChar?.some((c) => control.value?.includes(c))) {
        return {forbiddenCharacters: true};
      }
      return null;
    }
  }

  mobileAndTabletCheck = function () {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent);
    return check;
  };

  private findChildById(id: number): FsoModel | undefined {
    return this.currentFolder.children.find((elem) => elem.id === id);
  }

  private getChildIndex(child: FsoModel): number {
    return this.currentFolder.children.indexOf(child);
  }


  openFolder(id: number, isFolder: boolean = true) {
    if (!isFolder) return;
    const spinnerRef = this._dialog.open(this.spinnerTemplate, { disableClose: true, hasBackdrop: true });
    this.driveService.getFolder(id)
      .pipe(
        catchError(error => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          spinnerRef.close();
          return EMPTY;
        })
      ).subscribe(folder => {
        this.currentFolder = new FsoModel(folder);
        this.sortItems();
        spinnerRef.close();
      });
  }

  onFsoTouch(event: MouseEvent, id: number) {
    if (this.mobileAndTabletCheck()) {
      this.processMobileEvent(id);
    } else {
      this.processDesktopEvent(event, id);
    }
  }

  touchHelper = new FsoTouchHelper(DOUBLE_CLICK_THRESHOLD);
  private processMobileEvent(id: number) {
    const elem = this.findChildById(id);
    if (elem) {
      elem.isSelected = !elem.isSelected;
    }
    if (this.touchHelper.touch(id)) {
      this.openFolder(id, elem ? elem.isFolder : this.currentFolder.parentId === id);
    }
  }

  private processDesktopEvent(event: MouseEvent, id: number): void {
    const lastTouched = this.findChildById(id);
    if (!lastTouched) return;

    if (!event.ctrlKey && !event.shiftKey) {
      this.focusIndex = this.getChildIndex(lastTouched);
      this.selectOneElementById(lastTouched.id);
    } else if (event.ctrlKey && !event.shiftKey) {
      this.focusIndex = this.getChildIndex(lastTouched);
      lastTouched.isSelected = !lastTouched.isSelected;
    } else {
      const fso = this.findChildById(id);
      if (!fso) return;
      this.selectRange(this.focusIndex, this.getChildIndex(fso));
    }
  }

  private selectOneElementById(id: number) {
    this.currentFolder.children.forEach((elem) => {
      elem.isSelected = elem.id == id;
    });
  }

  private selectRange(start: number, end: number): void {
    this.currentFolder.children.forEach((elem, index) => {
      elem.isSelected = this.between(index, start, end);
    });
  }

  private between(x: number, val1: number, val2: number): boolean {
    const minVal = Math.min(val1, val2);
    const maxVal = Math.max(val1, val2);
    return x >= minVal && x <= maxVal;
  }

  private addFolder() {
    this._dialog.open(this.newFolderDialog, {
      disableClose: false,
      hasBackdrop: true,
      width: '400px'
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          return this.driveService.addFolder({
            name: this.newFolderControl.value,
            isFolder: true,
            parentId: this.currentFolder.id
          })
        }
        return EMPTY;
      }),
    ).subscribe({
      next: result => {
        this.currentFolder.children.push(new FsoModel(result));
        this.sortItems();
      },
      error: () => {
        this.newFolderControl.reset('');
        this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      },
      complete: () => {
        this.newFolderControl.reset('');
      }
    });
  }

  private selectedIds() {
    return this.currentFolder.children.reduce<number[]>((acc, elem) => {
      if (elem.isSelected) {
        acc.push(elem.id);
      }
      return acc;
    }, []);
  }

  private deleteSelected() {
    const selectedIds = this.selectedIds();
    this._dialog.open(this.deleteConfirmDialog, {
      disableClose: false,
      hasBackdrop: true,
      width: '400px'
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          return this.driveService.delete(selectedIds);
        }
        return EMPTY;
      })
    ).subscribe({
      next: () => {
        this.currentFolder.children = this.currentFolder.children.filter(elem => !selectedIds.includes(elem.id));
      },
      error: () => {
        this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      }
    });
  }

  private rename() {
    const selected = this.currentFolder.children.find((elem) => elem.isSelected);
    if (!selected) return;
    this.renameControl.setValue(selected.name);
    this._dialog.open(this.renameDialog, {
      disableClose: false,
      hasBackdrop: true,
      width: '400px'
    }).afterClosed().pipe(
      switchMap(dialogResult => {
        if (dialogResult) {
          return this.driveService.rename({id: selected.id, name: this.renameControl.value});
        }
        return EMPTY;
      }),
    ).subscribe({
      next: () => {
        selected.name = this.renameControl.value;
      },
      error: (error: HttpErrorResponse) => {
        this._snackBar.open(`Error. ${error.error}`, 'Ok', SNACKBAR_OPTIONS);
      }
    })
  }

  uploadFile(files: FileList | null) {
    if (!files) return;
    const formData = new FormData();
    Array.from(files).forEach((file, index) => {
      formData.append('files', file, file.name);
    });
    formData.append('parentId', this.currentFolder.id.toString());
    this.driveService.upload(formData).subscribe({
      next: event => {
        if (event.type === HttpEventType.Response && Array.isArray(event.body)) {
          const result = event.body.map(x => new FsoModel(x));
          result.forEach(x => x.isSelected = true);
          this.currentFolder.children.forEach(x => x.isSelected = false);
          this.currentFolder.children.push(...result);
          this.progressBar = 0;
          if (this.inputFiles) this.inputFiles.nativeElement.value = '';
          this.currentFolder.children.sort(this.sortedBy);
        } else if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progressBar = Math.round((100 * event.loaded) / event.total);
        }
      },
      error: () => {
        this.progressBar = 0;
      }
    });
  }

  private download() {
    const elements = this.currentFolder.children.filter(x => x.isSelected);
    let downloadFileName = '';
    if (elements.length == 1 && !elements[0].isFolder)
      downloadFileName = elements[0].name;
    else downloadFileName = `files-${Date.now()}`;

    this.driveService.download(elements.map(x => x.id)).subscribe({
      next: (event: HttpEvent<any>) => {
        if (event.type === HttpEventType.Response) {
          const FileSaver = require('file-saver');
          FileSaver.saveAs(event.body as Blob, downloadFileName);
          this.progressBar = 0;
        } else if (event.type === HttpEventType.DownloadProgress && event.total) {
          this.progressBar = Math.round((100 * event.loaded) / event.total);
        }
      },
      error: () => {
        this.progressBar = 0;
      }
    });
  }


  onToolbarEvent(event: string) {
    switch (event) {
      case 'new': {
        this.addFolder();
        break;
      }
      case 'upload': {
        this.inputFiles?.nativeElement.click();
        break;
      }
      case 'download': {
        this.download();
        break;
      }
      case 'delete': {
        this.deleteSelected();
        break;
      }
      case 'rename': {
        this.rename();
        break;
      }
      case 'sortName': {
        this.sortItems('name');
        break;
      }
      case 'sortSize': {
        this.sortItems('size');
        break;
      }
      case 'sortDate': {
        this.sortItems('date');
        break;
      }
      case 'changeView': {
        break;
      }
      case 'cut': {
        this.cutItems();
        break;
      }
      case 'paste': {
        this.moveItems();
        break;
      }
      default: {
        break;
      }
    }
  }

  private sortItems(sortBy?: 'name' | 'date' | 'size') {
    switch (sortBy) {
      case 'name': {
        const sortByNameFn = this.sortedBy === this.fsoSortService.sortByNameAscFn ? this.fsoSortService.sortByNameDescFn : this.fsoSortService.sortByNameAscFn;
        this.sorter.next(sortByNameFn);
        break;
      }
      case "size": {
        const sortBySizeFn = this.sortedBy === this.fsoSortService.sortBySizeAscFn ? this.fsoSortService.sortBySizeDescFn : this.fsoSortService.sortBySizeAscFn;
        this.sorter.next(sortBySizeFn);
        break;
      }
      case "date": {
        const sortByDateFn = this.sortedBy === this.fsoSortService.sortByDateAscFn ? this.fsoSortService.sortByDateDescFn : this.fsoSortService.sortByDateAscFn;
        this.sorter.next(sortByDateFn);
        break;
      }
      default: {
        this.sorter.next(this.sortedBy);
        break;
      }
    }
  }

  private cutItems() {
    const clipboard = this.currentFolder.children.reduce<number[]>((acc, elem) => {
      if (elem.isSelected) {
        elem.isCut = true;
        acc.push(elem.id);
      } else {
        elem.isCut = false;
      }
      return acc;
    }, []);
    if (clipboard.length === 0) return;
    this._snackBar.open(`Moved to clipboard ${clipboard.length} item(s)`, 'Ok', SNACKBAR_OPTIONS);
    this.driveService.clipboard$.next(clipboard);
  }

  private moveItems() {
    const clipboard = this.driveService.clipboard$.getValue();
    if (clipboard.length === 0) return;
    this.driveService.move(clipboard, this.currentFolder.id)
      .pipe(
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          return EMPTY;
        })
      ).subscribe(result => {
      this.driveService.clipboard$.next([]);
      result.success?.forEach(item => {
        item.isSelected = true;
      });

      this.currentFolder.children.push(...result.success);
      this.sortItems();

      if (result.fail?.length > 0) {
        this._snackBar.open(`Error. Unable to move ${result.fail?.length} item(s)`, 'Ok', SNACKBAR_OPTIONS);
      }
      this.currentFolder.children.forEach(x => x.isCut = false);
    });
  }

  get selectedCount() {
    return this.currentFolder?.children.filter(x => x.isSelected).length;
  }


  getNewFolderErrorMessage() {
    if(this.newFolderControl.getError('required')) {
      return 'Name is Required.';
    }
    if (this.newFolderControl.getError('nameNotUnique')) {
      return 'Name is NOT Unique.'
    }
    if (this.newFolderControl.getError('forbiddenCharacters')) {
      return 'Name has Forbidden Characters.'
    }
    return '';
  }
}
