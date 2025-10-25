import { CompareFsoFn, FsoSortService } from '../../../services/fso-sort.service';
import { catchError, switchMap, distinctUntilChanged, first, tap } from 'rxjs/operators';
import { Subscription, EMPTY, Subject, Observable, map, debounceTime, of, finalize } from 'rxjs';
import { HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { FsoModel, FsoTouchHelper } from '../../../model/fso.model';
import { DriveService } from '../../../services/drive.service';
import {
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  ViewChild,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import {
  MatDialog,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  AbstractControl,
  AsyncValidatorFn,
  FormControl,
  ValidationErrors,
  ValidatorFn,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { saveAs } from 'file-saver';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { PathBarComponent } from '../pathbar/path-bar.component';
import { FsoComponent } from '../fso/fso.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { StorageInfoComponent } from '../storage-info/storage-info.component';

const SNACKBAR_OPTIONS = { duration: 3000 };
const DOUBLE_CLICK_THRESHOLD = 300;
@Component({
  selector: 'app-drive',
  templateUrl: './drive.component.html',
  styleUrls: ['./drive.component.scss'],
  imports: [
    ToolbarComponent,
    MatProgressBar,
    PathBarComponent,
    FsoComponent,
    MatProgressSpinner,
    MatDialogTitle,
    CdkDrag,
    CdkDragHandle,
    MatDialogContent,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    ReactiveFormsModule,
    MatError,
    MatDialogActions,
    MatButton,
    MatDialogClose,
  ],
})
export class DriveComponent implements OnInit, OnDestroy {
  private readonly fsoSortService = inject(FsoSortService);
  private readonly driveService = inject(DriveService);
  private readonly _dialog = inject(MatDialog);
  private readonly _snackBar = inject(MatSnackBar);
  private readonly DEFAULT_SORT = this.fsoSortService.sortByNameAscFn;
  currentFolder: FsoModel | null = null;
  pageIsReady = signal(false);
  focusIndex = 0;
  forbiddenChar: string[];
  progressBar = 0;
  @ViewChild('newFolderDialog', { static: true }) newFolderDialog: TemplateRef<unknown> | null =
    null;
  @ViewChild('renameDialog', { static: true }) renameDialog: TemplateRef<unknown> | null = null;
  @ViewChild('deleteConfirmDialog', { static: true })
  deleteConfirmDialog: TemplateRef<unknown> | null = null;
  @ViewChild('inputFiles', { static: true }) inputFiles: ElementRef<HTMLInputElement> | null = null;
  @ViewChild('loading', { static: true }) spinnerTemplate: TemplateRef<unknown> | null = null;
  private sorter: Subject<CompareFsoFn> = new Subject<CompareFsoFn>();
  private sortedBy = this.DEFAULT_SORT;
  subscriptions = new Subscription();
  newFolderControl = new FormControl(
    '',
    [Validators.required, this.noForbiddenCharactersValidator()],
    this.uniqueFolderNameAsyncValidator()
  );
  renameControl = new FormControl('', Validators.required);
  constructor() {
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
    const openFolderSubscription = this.driveService.openFolder$.subscribe((id) => {
      this.openFolder(id, true);
    });
    this.subscriptions.add(openFolderSubscription);

    this.driveService.getUserRoot().subscribe({
      next: (fso: FsoModel) => {
        this.currentFolder = new FsoModel(fso);
        this.sortItems();
        this.pageIsReady.set(true);
      },
      error: () => {
        this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      },
    });

    const sorterSubscription = this.sorter.subscribe((sortFn) => {
      if (this.currentFolder && this.currentFolder.children) {
        this.currentFolder.children.sort(sortFn);
        this.sortedBy = sortFn;
      }
    });
    this.subscriptions.add(sorterSubscription);
  }

  uniqueFolderNameAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl<string>): Observable<ValidationErrors | null> =>
      control.valueChanges.pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((value) =>
          this.driveService.uniqueName(value, this.currentFolder?.id || -1, true)
        ),
        catchError(() => of(false)),
        map((unique: boolean) => (unique ? null : { nameNotUnique: true })),
        first()
      );
  }

  noForbiddenCharactersValidator(): ValidatorFn {
    return (control: AbstractControl<string>): ValidationErrors | null => {
      if (this.forbiddenChar?.some((c) => control.value?.includes(c))) {
        return { forbiddenCharacters: true };
      }
      return null;
    };
  }

  mobileAndTabletCheck = () =>
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);

  private findChildById(id: number): FsoModel | undefined {
    return this.currentFolder?.children.find((elem) => elem.id === id);
  }

  private getChildIndex(child: FsoModel): number {
    return this.currentFolder?.children.indexOf(child) || -1;
  }

  private openSpinnerDialog() {
    if (this.spinnerTemplate) {
      return this._dialog.open(this.spinnerTemplate, {
        disableClose: true,
        hasBackdrop: true,
      });
    }
    return undefined;
  }

  openFolder(id: number | null, isFolder: boolean = true) {
    if (!isFolder || id == null) return;
    const spinnerRef = this.openSpinnerDialog();
    this.driveService
      .getFolder(id)
      .pipe(
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          spinnerRef?.close();
          return EMPTY;
        })
      )
      .subscribe((folder) => {
        this.currentFolder = new FsoModel(folder);
        this.sortItems();
        spinnerRef?.close();
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
      this.openFolder(id, elem ? elem.isFolder : this.currentFolder?.parentId === id);
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
    this.currentFolder?.children.forEach((elem) => {
      elem.isSelected = elem.id == id;
    });
  }

  private selectRange(start: number, end: number): void {
    this.currentFolder?.children.forEach((elem, index) => {
      elem.isSelected = this.between(index, start, end);
    });
  }

  private between(x: number, val1: number, val2: number): boolean {
    const minVal = Math.min(val1, val2);
    const maxVal = Math.max(val1, val2);
    return x >= minVal && x <= maxVal;
  }

  private addFolder() {
    if (this.newFolderDialog == null) return;
    this._dialog
      .open(this.newFolderDialog, {
        disableClose: false,
        hasBackdrop: true,
        width: '400px',
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult && this.currentFolder && this.newFolderControl.value) {
            return this.driveService.addFolder(this.newFolderControl.value, this.currentFolder.id);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: (result) => {
          if (Array.isArray(this.currentFolder?.children)) {
            this.currentFolder.children.push(new FsoModel(result));
            this.sortItems();
          }
        },
        error: () => {
          this.newFolderControl.reset('');
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
        },
        complete: () => {
          this.newFolderControl.reset('');
        },
      });
  }

  private selectedIds() {
    const children = Array.isArray(this.currentFolder?.children) ? this.currentFolder.children : [];
    return children.reduce<number[]>((acc, elem) => {
      if (elem.isSelected) {
        acc.push(elem.id);
      }
      return acc;
    }, []);
  }

  private deleteSelected() {
    if (this.deleteConfirmDialog == null) return;
    const selectedIds = this.selectedIds();
    this._dialog
      .open(this.deleteConfirmDialog, {
        disableClose: false,
        hasBackdrop: true,
        width: '400px',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult) {
            return this.driveService.delete(selectedIds);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          if (Array.isArray(this.currentFolder?.children)) {
            this.currentFolder.children = this.currentFolder.children.filter(
              (elem) => !selectedIds.includes(elem.id)
            );
          }
        },
        error: () => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
        },
      });
  }

  private rename() {
    if (this.renameDialog == null || !Array.isArray(this.currentFolder?.children)) return;
    const selected = this.currentFolder.children.find((elem) => elem.isSelected);
    if (selected == null) return;
    this.renameControl.setValue(selected.name);
    this._dialog
      .open(this.renameDialog, {
        disableClose: false,
        hasBackdrop: true,
        width: '400px',
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          const newValue = (this.renameControl.value || '').trim();
          if (dialogResult && newValue !== '') {
            return this.driveService.rename(selected.id, newValue);
          }
          return EMPTY;
        })
      )
      .subscribe({
        next: () => {
          const value = this.renameControl.value;
          if (value !== null) {
            selected.name = value;
          }
        },
        error: (error: HttpErrorResponse) => {
          this._snackBar.open(`Error. ${error.error}`, 'Ok', SNACKBAR_OPTIONS);
        },
      });
  }

  private buildFileUploadFormData(files: File[], parentId: number) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    formData.append('parentId', parentId.toString());
    return formData;
  }
  uploadFile(files: FileList | null) {
    if (!files || this.currentFolder == null) return;
    const parentId = this.currentFolder.id;
    const fileArray = Array.from(files);
    const totalUploadSize = fileArray.reduce((a, b) => a + b.size, 0);

    this.driveService
      .getStorageInfo()
      .pipe(
        catchError(() => {
          this._snackBar.open('Unable to get disk status', 'Ok', { duration: 3000 });
          return EMPTY;
        }),
        switchMap((storageInfo) => {
          if (
            storageInfo == null ||
            storageInfo.totalUsed + totalUploadSize > storageInfo.storageSize
          ) {
            throw new Error('Not enough space.');
          }
          const formData = this.buildFileUploadFormData(fileArray, parentId);
          return this.driveService.upload(formData);
        }),
        tap((event) => {
          if (
            event.type === HttpEventType.Response &&
            Array.isArray(event.body) &&
            Array.isArray(this.currentFolder?.children)
          ) {
            const result = event.body.map((x) => new FsoModel(x));
            result.forEach((x) => (x.isSelected = true));
            this.currentFolder.children.forEach((x) => (x.isSelected = false));
            this.currentFolder.children.push(...result);

            this.currentFolder.children.sort(this.sortedBy);
          } else if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progressBar = Math.round((100 * event.loaded) / event.total);
          }
        }),
        catchError((err) => {
          let text = 'An error occurred';
          if (err instanceof HttpErrorResponse && typeof err.error === 'string') {
            text = err.error;
          } else if (typeof err.message === 'string') {
            text = err.message;
          }
          this._snackBar.open(text, 'Ok', { duration: 3000 });
          return EMPTY;
        }),
        finalize(() => {
          this.progressBar = 0;
          if (this.inputFiles) this.inputFiles.nativeElement.value = '';
        })
      )
      .subscribe();
  }

  private download() {
    const elements = this.currentFolder?.children.filter((x) => x.isSelected);
    let downloadFileName = '';
    if (elements == null) return;
    if (elements.length == 1 && !elements[0].isFolder) downloadFileName = elements[0].name;
    else downloadFileName = `files-${Date.now()}.zip`;

    this.driveService.download(elements.map((x) => x.id)).subscribe({
      next: (event: HttpEvent<unknown>) => {
        if (event.type === HttpEventType.Response) {
          saveAs(event.body as Blob, downloadFileName);
          this.progressBar = 0;
        } else if (event.type === HttpEventType.DownloadProgress && event.total) {
          this.progressBar = Math.round((100 * event.loaded) / event.total);
        }
      },
      error: () => {
        this.progressBar = 0;
      },
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
      case 'disk-info': {
        this.showStorageInfo();
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
        const sortByNameFn =
          this.sortedBy === this.fsoSortService.sortByNameAscFn
            ? this.fsoSortService.sortByNameDescFn
            : this.fsoSortService.sortByNameAscFn;
        this.sorter.next(sortByNameFn);
        break;
      }
      case 'size': {
        const sortBySizeFn =
          this.sortedBy === this.fsoSortService.sortBySizeAscFn
            ? this.fsoSortService.sortBySizeDescFn
            : this.fsoSortService.sortBySizeAscFn;
        this.sorter.next(sortBySizeFn);
        break;
      }
      case 'date': {
        const sortByDateFn =
          this.sortedBy === this.fsoSortService.sortByDateAscFn
            ? this.fsoSortService.sortByDateDescFn
            : this.fsoSortService.sortByDateAscFn;
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
    const clipboard = this.currentFolder?.children.reduce<number[]>((acc, elem) => {
      if (elem.isSelected) {
        elem.isCut = true;
        acc.push(elem.id);
      } else {
        elem.isCut = false;
      }
      return acc;
    }, []);
    if (clipboard == null || clipboard.length === 0) return;
    this._snackBar.open(`Moved to clipboard ${clipboard.length} item(s)`, 'Ok', SNACKBAR_OPTIONS);
    //this.driveService.clipboard$.next(clipboard);
    this.driveService.clipboard.set([...clipboard]);
  }

  private moveItems() {
    //const clipboard = this.driveService.clipboard$.getValue();
    const clipboard = this.driveService.clipboard();
    if (
      clipboard.length === 0 ||
      this.currentFolder == null ||
      !Array.isArray(this.currentFolder.children)
    )
      return;
    this.driveService
      .move(clipboard, this.currentFolder.id)
      .pipe(
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          return EMPTY;
        })
      )
      .subscribe((result) => {
        //this.driveService.clipboard$.next([]);
        this.driveService.clipboard.set([]);
        result.success?.forEach((item) => {
          item.isSelected = true;
        });

        if (Array.isArray(this.currentFolder?.children)) {
          this.currentFolder.children.push(...result.success);
          this.sortItems();
          this.currentFolder.children.forEach((x) => (x.isCut = false));
        }

        if (result.fail?.length > 0) {
          this._snackBar.open(
            `Error. Unable to move ${result.fail?.length} item(s)`,
            'Ok',
            SNACKBAR_OPTIONS
          );
        }
      });
  }

  get selectedCount() {
    return this.currentFolder?.children.filter((x) => x.isSelected).length ?? 0;
  }

  getNewFolderErrorMessage() {
    if (this.newFolderControl.getError('required')) {
      return 'Name is Required.';
    }
    if (this.newFolderControl.getError('nameNotUnique')) {
      return 'Name is NOT Unique.';
    }
    if (this.newFolderControl.getError('forbiddenCharacters')) {
      return 'Name has Forbidden Characters.';
    }
    return '';
  }

  private showStorageInfo() {
    this.driveService
      .getStorageInfo()
      .pipe(
        tap((storageInfo) => {
          this._dialog.open(StorageInfoComponent, {
            width: '500px',
            hasBackdrop: true,
            data: storageInfo,
            autoFocus: false,
          });
        })
      )
      .subscribe();
  }
}
