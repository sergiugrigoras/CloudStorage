import { catchError, switchMap, tap } from 'rxjs/operators';
import { EMPTY, finalize } from 'rxjs';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  StorageNode,
  NodeTouchHelper,
  ISimpleNode,
  ROOT_NODE,
  CompareFsoFn,
  NODE_SORT_FN,
  IStorageNodeModel,
} from '../../../model/storage-node.model';
import { DriveService } from '../../../services/drive.service';
import {
  Component,
  ElementRef,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
  signal,
  WritableSignal,
  computed,
} from '@angular/core';
import {
  MatDialog,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { saveAs } from 'file-saver';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { FsoComponent } from '../fso/fso.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { MatButton } from '@angular/material/button';
import { StorageInfoComponent } from '../storage-info/storage-info.component';
import { ShowOnDirtyErrorStateMatcher } from '@angular/material/core';
import { PathBarComponent } from '../pathbar/path-bar.component';

const DOUBLE_CLICK_THRESHOLD = 300;
@Component({
  selector: 'app-drive',
  templateUrl: './drive.component.html',
  styleUrls: ['./drive.component.scss'],
  imports: [
    ToolbarComponent,
    MatProgressBar,
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
    PathBarComponent,
  ],
})
export class DriveComponent implements OnInit {
  private readonly driveService = inject(DriveService);
  private readonly _dialog = inject(MatDialog);
  private readonly _snackBar = inject(MatSnackBar);
  currentFolder: StorageNode | null = null;
  pageIsReady = signal(false);
  focusIndex = 0;
  progressBar = 0;
  @ViewChild('newFolderDialog', { static: true }) newFolderDialog!: TemplateRef<unknown>;
  @ViewChild('renameDialog', { static: true }) renameDialog!: TemplateRef<unknown>;
  @ViewChild('deleteConfirmDialog', { static: true }) deleteConfirmDialog!: TemplateRef<unknown>;
  @ViewChild('inputFiles', { static: true }) inputFiles!: ElementRef<HTMLInputElement>;

  private nodeSort: WritableSignal<CompareFsoFn> = signal(NODE_SORT_FN.NAME.ASC);
  newFolderControl = new FormControl('', Validators.required);
  renameControl = new FormControl('', Validators.required);
  constructor() {}

  private readonly nodes: WritableSignal<StorageNode[]> = signal([]);
  protected readonly currentNode: WritableSignal<ISimpleNode> = signal(ROOT_NODE);
  protected readonly currentNodeContent = computed(() => {
    const sortFn = this.nodeSort();
    return [
      ...this.nodes()
        .filter((node) => node.parentId === this.currentNode().id)
        .sort(sortFn),
    ];
  });
  protected readonly selectedItems = computed(() => [
    ...this.currentNodeContent()
      .filter((x) => x.isSelected())
      .map((x) => x.id),
  ]);
  protected readonly path = computed(() => {
    const nodes = this.nodes().map((x) => x.toSimpleNode());
    let cursor: ISimpleNode = this.currentNode();
    const result: ISimpleNode[] = [];

    while (cursor.id != null) {
      result.unshift(cursor);
      const node = nodes.find((x) => x.id === cursor.parentId);
      cursor = node ?? ROOT_NODE;
    }
    result.unshift(cursor);
    return result;
  });

  protected readonly showOnDirtyErrorStateMatcher = new ShowOnDirtyErrorStateMatcher();

  ngOnInit() {
    this.driveService
      .getNodes()
      .pipe(
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          this.nodes.set(result.map((x) => new StorageNode(x)));
          this.sortItems();
        }),
        finalize(() => {
          this.pageIsReady.set(true);
        })
      )
      .subscribe();
  }

  mobileAndTabletCheck = () =>
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);

  private findChildById(id: string): StorageNode | undefined {
    return this.currentNodeContent().find((elem) => elem.id === id);
  }

  private getChildIndex(child: StorageNode): number {
    return this.currentNodeContent().indexOf(child);
  }

  private clearSelectedItems(): void {
    this.nodes().forEach((node) => {
      node.isSelected.set(false);
    });
  }
  openFolder(id: string | null) {
    this.clearSelectedItems();
    if (id) {
      const fso = this.nodes().find((x) => x.id === id && x.isFolder);
      if (fso) {
        this.currentNode.set(fso.toSimpleNode());
      }
    } else {
      this.currentNode.set(ROOT_NODE);
    }
  }

  onFsoTouch(event: MouseEvent, id: string | null) {
    if (id === null) {
      return;
    }
    if (this.mobileAndTabletCheck()) {
      this.processMobileEvent(id);
    } else {
      this.processDesktopEvent(event, id);
    }
  }

  touchHelper = new NodeTouchHelper(DOUBLE_CLICK_THRESHOLD);
  private processMobileEvent(id: string) {
    const elem = this.findChildById(id);
    if (elem) {
      elem.isSelected.update((value) => !value);
    }
    if (this.touchHelper.touch(id)) {
      this.openFolder(id);
    }
  }

  private processDesktopEvent(event: MouseEvent, id: string): void {
    const lastTouched = this.findChildById(id);
    if (!lastTouched) return;

    if (!event.ctrlKey && !event.shiftKey) {
      this.focusIndex = this.getChildIndex(lastTouched);
      this.selectOneElementById(lastTouched.id);
    } else if (event.ctrlKey && !event.shiftKey) {
      this.focusIndex = this.getChildIndex(lastTouched);
      lastTouched.isSelected.update((value) => !value);
    } else {
      const fso = this.findChildById(id);
      if (!fso) return;
      this.selectRange(this.focusIndex, this.getChildIndex(fso));
    }
  }

  private selectOneElementById(id: string) {
    this.currentNodeContent().forEach((elem) => {
      elem.isSelected.set(elem.id == id);
    });
  }

  private selectRange(start: number, end: number): void {
    this.currentNodeContent().forEach((elem, index) => {
      elem.isSelected.set(this.between(index, start, end));
    });
  }

  private between(x: number, val1: number, val2: number): boolean {
    const minVal = Math.min(val1, val2);
    const maxVal = Math.max(val1, val2);
    return x >= minVal && x <= maxVal;
  }

  private addFolder() {
    this._dialog
      .open(this.newFolderDialog, {
        disableClose: false,
        hasBackdrop: true,
        width: '400px',
      })
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult && this.newFolderControl.value) {
            const newNode: IStorageNodeModel = {
              isFolder: true,
              parentId: this.currentNode().id,
              name: this.newFolderControl.value,
            };
            return this.driveService.addFolder(newNode);
          }
          return EMPTY;
        }),
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          const newNode = new StorageNode(result);
          newNode.isSelected.set(true);
          this.clearSelectedItems();
          this.nodes.update((value) => {
            return [...value, newNode];
          });
          if (Array.isArray(this.currentFolder?.children)) {
            this.currentFolder.children.push(new StorageNode(result));
            this.sortItems();
          }
        }),
        finalize(() => {
          this.newFolderControl.reset('');
        })
      )
      .subscribe();
  }

  private deleteSelected() {
    const selectedItems = this.selectedItems();
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
            return this.driveService.delete(selectedItems);
          }
          return EMPTY;
        }),
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap(() => {
          this.nodes.update((value) => [...value.filter((x) => !selectedItems.includes(x.id))]);
        })
      )
      .subscribe();
  }

  private rename() {
    const selected = this.currentNodeContent().find((x) => x.isSelected());
    if (!selected) return;
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
            const update: IStorageNodeModel = {
              id: selected.id,
              name: newValue,
              parentId: selected.parentId,
              isFolder: selected.isFolder,
            };
            return this.driveService.rename(update);
          }
          return EMPTY;
        }),
        catchError((error: unknown) => {
          let message = 'An error occurred.';
          if (error instanceof HttpErrorResponse && typeof error.error === 'string') {
            message = error.error;
          }
          this._snackBar.open(message, 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          const updatedNode = new StorageNode(result);
          updatedNode.isSelected.set(true);
          this.nodes.update((value) => {
            const index = value.findIndex((x) => x.id === updatedNode.id);
            if (index >= 0) {
              value[index] = updatedNode;
            }
            return [...value];
          });
        })
      )
      .subscribe();
  }

  private buildFileUploadFormData(files: File[], nodeId: string | null) {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    if (nodeId != null) {
      formData.append('nodeId', nodeId);
    }
    return formData;
  }

  uploadFile(files: FileList | null) {
    if (!files) return;
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
          const formData = this.buildFileUploadFormData(fileArray, this.currentNode().id);
          return this.driveService.upload(formData);
        }),
        tap((event) => {
          if (event.type === HttpEventType.Response && Array.isArray(event.body)) {
            this.clearSelectedItems();
            const result = event.body.map((x) => new StorageNode(x));
            result.forEach((x) => x.isSelected.set(true));
            this.nodes.update((value) => {
              return [...value, ...result];
            });
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
    const nodes = this.nodes().filter((x) => x.isSelected());
    if (nodes.length === 0) {
      this._snackBar.open('Select at least one element', 'Ok');
      return;
    }

    const downloadFileName =
      nodes.length == 1 && !nodes[0].isFolder ? nodes[0].fullName : `files-${Date.now()}.zip`;
    this.driveService
      .download(nodes.map((x) => x.id))
      .pipe(
        catchError(() => {
          this._snackBar.open('An error occurred', 'Ok');
          return EMPTY;
        }),
        tap((event) => {
          if (event.type === HttpEventType.Response) {
            saveAs(event.body as Blob, downloadFileName);
            this.progressBar = 0;
          } else if (event.type === HttpEventType.DownloadProgress && event.total) {
            this.progressBar = Math.round((100 * event.loaded) / event.total);
          }
        }),
        finalize(() => {
          this.progressBar = 0;
        })
      )
      .subscribe();
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
        this.nodeSort.update((value) =>
          value === NODE_SORT_FN.NAME.ASC ? NODE_SORT_FN.NAME.DESC : NODE_SORT_FN.NAME.ASC
        );
        break;
      }
      case 'size': {
        this.nodeSort.update((value) =>
          value === NODE_SORT_FN.SIZE.ASC ? NODE_SORT_FN.SIZE.DESC : NODE_SORT_FN.SIZE.ASC
        );
        break;
      }
      case 'date': {
        this.nodeSort.update((value) =>
          value === NODE_SORT_FN.DATE.ASC ? NODE_SORT_FN.DATE.DESC : NODE_SORT_FN.DATE.ASC
        );
        break;
      }
      default: {
        break;
      }
    }
  }

  private cutItems() {
    const clipboard = this.currentNodeContent().reduce<string[]>((acc, elem) => {
      if (elem.isSelected()) {
        elem.isCut.set(true);
        acc.push(elem.id);
      } else {
        elem.isCut.set(false);
      }
      return acc;
    }, []);

    if (clipboard.length === 0) return;
    this._snackBar.open(`Moved to clipboard ${clipboard.length} item(s)`, 'Ok');
    this.driveService.clipboard.set([...clipboard]);
  }

  private moveItems() {
    if (this.driveService.clipboard().length === 0) return;

    this.driveService
      .move(this.driveService.clipboard(), this.currentNode().id)
      .pipe(
        catchError(() => {
          this._snackBar.open(`An Error occurred.`, 'Ok');
          return EMPTY;
        }),
        tap((result) => {
          this.driveService.clipboard.set([]);
          this.clearSelectedItems();
          const updatedNodes = new Map(
            result.map((x) => {
              const node = new StorageNode(x);
              return [node.id, node];
            })
          );
          this.nodes.update((value) => {
            for (let i = 0; i < value.length; i++) {
              const update = updatedNodes.get(value[i].id);
              if (update === undefined) continue;
              if (update.parentId === this.currentNode().id) {
                update.isSelected.set(true);
              }
              value[i] = update;
            }
            return [...value];
          });
        })
      )
      .subscribe();
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
