import { environment } from './../../../environments/environment';
import { FsoSortService } from './../../services/fso-sort.service';
import { ProgressBarModel } from '../../interfaces/progress-bar.interface';
import { DiskModel } from './../../interfaces/disk.interface';
import { tap, catchError, delay } from 'rxjs/operators';
import { Subscription, EMPTY, Subject } from 'rxjs';
import { HttpEventType } from '@angular/common/http';
import { FsoModel } from './../../interfaces/fso.interface';
import { DriveService } from './../../services/drive.service';
import { Component, ElementRef, Inject, OnInit, TemplateRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';


const SNACKBAR_OPTIONS = { duration: 5000 };
const DOUBLE_CLICK_THRESHOLD = 300;
@Component({
  selector: 'app-drive',
  templateUrl: './drive.component.html',
  styleUrls: ['./drive.component.scss'],
})
export class DriveComponent implements OnInit, OnDestroy {
  private readonly DEFAULT_VIEW = 'listView';
  private readonly DEFAULT_SORT = this.fsoSortService.sortByNameAscFn;

  drive: FsoModel;
  currentFolder: FsoModel;
  pageIsReady = false;
  folder: FsoModel;
  focusIndex = 0;
  newFolderName = '';
  fullPath: FsoModel[];
  disk: DiskModel;
  forbiddenChar: string[];
  isFsoNameValid = false;
  view: string;
  progressBar: ProgressBarModel = {
    progress: 0,
    text: '',
    inProgress: false,
    loaded: 0,
    total: 0,
    background: 'success',
  };
  shareId = '';
  validEmail = false;
  scrHeight: number;
  scrWidth: number;
  @ViewChild('newFolderDialog', { static: true }) newFolderDialog: TemplateRef<any>;
  @ViewChild('renameConfirmModal') renameConfirmModal?: TemplateRef<any>;
  @ViewChild('deleteConfirmModal') deleteConfirmModal?: TemplateRef<any>;
  @ViewChild('shareConfirmModal') shareConfirmModal?: TemplateRef<any>;
  @ViewChild('inputFiles') inputFiles?: ElementRef;
  @ViewChild('loading', { static: true }) spinnerTemplate: TemplateRef<any>;
  sorter: Subject<any> = new Subject<any>();
  sorterSubscription: Subscription;
  openFolderSubscription: Subscription;
  sortedBy = this.DEFAULT_SORT;
  apiCallsSubscription: Subscription;
  private touchtime: any = {};

  constructor(
    private fsoSortService: FsoSortService,
    private driveService: DriveService,
    private _dialog: MatDialog,
    private _snackBar: MatSnackBar,
    @Inject(DOCUMENT) document: Document
  ) {
    this.disk = { usedBytes: 0, totalBytes: 0, diskUsed: 0 };
    this.forbiddenChar = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    for (let i = 0; i <= 31; i++) {
      this.forbiddenChar.unshift(String.fromCharCode(i));
    }
    this.forbiddenChar.unshift(String.fromCharCode(127));
  }

  @HostListener('window:resize', ['$event'])
  private getScreenSize() {
    this.scrHeight = window.innerHeight;
    this.scrWidth = window.innerWidth;
  }

  mobileAndTabletCheck = function () {
    let check = false;
    (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent);
    return check;
  };

  ngOnDestroy(): void {
    this.apiCallsSubscription?.unsubscribe();
    this.sorterSubscription?.unsubscribe();
    this.openFolderSubscription?.unsubscribe();
  }

  ngOnInit() {
    this.getScreenSize();
    this.driveService.openFolder$.subscribe(id => {
      this.openFolder(id, true);
    });
    this.driveService.getUserRoot()
      .pipe(
        catchError(error => {
          this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          return EMPTY;
        })
      )
      .subscribe(
        {
          next: (folder: FsoModel) => {
            this.currentFolder = new FsoModel(folder);
            this.setView();
            this.sorter.next(this.sortedBy);
            this.pageIsReady = true;
          },
          error: () => {
            this._snackBar.open(`An Error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          }
        }
      );

    this.sorterSubscription = this.sorter.subscribe((sortFn) => {
      const sortElements = (sortFn: any) => {
        if (this.currentFolder && this.currentFolder.children.length > 1) {
          this.currentFolder.children = this.currentFolder.children.sort(sortFn);
        }
      };
      sortElements(sortFn);
      this.sortedBy = sortFn;
    });
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
        this.sorter.next(this.sortedBy);
        // localStorage.setItem('folder', this.currentFolder.id.toString());
        this.setView();
        spinnerRef.close();
      });
  }

  private setView() {
    let view = localStorage.getItem(`view`);
    if (view) this.view = view;
    else {
      this.view = this.DEFAULT_VIEW;
      localStorage.setItem(`view`, this.DEFAULT_VIEW);
    }
  }

  fsoTouched(event: any, id: number) {
    if (this.mobileAndTabletCheck()) {
      const elem = this.currentFolder.children.find((elem) => elem.id == id);
      if (elem) {
        elem.isSelected = !elem.isSelected;
      }
      if (this.touchtime[id] === undefined) {
        this.touchtime[id] = new Date().getTime();
      } else {
        if (((new Date().getTime()) - this.touchtime[id]) < DOUBLE_CLICK_THRESHOLD) {
          this.openFolder(id, elem.isFolder);
          this.touchtime[id] = undefined;
        } else {
          this.touchtime[id] = new Date().getTime();
        }
      }
      return;
    }
    if (!event.ctrlKey && !event.shiftKey) {
      let lastTouched = this.currentFolder.children.find((elem) => elem.id == id);
      if (lastTouched) {
        this.focusIndex = this.currentFolder.children.indexOf(lastTouched);
        this.selectOneElement(lastTouched.id);
      }
    } else if (event.ctrlKey && !event.shiftKey) {
      let lastTouched = this.currentFolder.children.find((elem) => elem.id == id);
      if (lastTouched) {
        this.focusIndex = this.currentFolder.children.indexOf(lastTouched);
        lastTouched.isSelected = !lastTouched.isSelected;
      }
    } else {
      let f = this.currentFolder.children.find((elem) => elem.id == id);
      if (f) {
        this.currentFolder.children.forEach((elem) => {
          if (
            this.between(
              this.currentFolder.children.indexOf(elem),
              this.focusIndex,
              this.currentFolder.children.indexOf(f!)
            )
          ) {
            elem.isSelected = true;
          }
          else elem.isSelected = false;
        });
      }
    }
  }

  selectOneElement(id: number) {
    this.currentFolder.children.forEach((elem) => {
      if (elem.id != id) elem.isSelected = false;
      else elem.isSelected = true;
    });
  }

  addFolder(name: string) {
    this.driveService.addFolder({ name: name, isFolder: true, parentId: this.currentFolder.id }).subscribe(result => {
      this.currentFolder.children.push(new FsoModel(result));
      this.sorter.next(this.sortedBy);
      this.newFolderName = '';
    });
  }

  deleteSelected() {
    /*     let delArr: string[] = [];
        this.content.forEach((elem) => {
          if (elem.isSelected) {
            delArr.push(String(elem.id!));
          }
        });
        this.removeFsoFromUI(delArr);
        this.driveService
          .delete(delArr)
          .pipe(
            catchError((error) => {
              return throwError(error);
            }),
            switchMap(() => {
              return this.driveService.getUserDiskInfo();
            }),
            tap((disk) => (this.disk = disk))
          )
          .subscribe(); */
  }

  /*   openModal(options: string) {
      switch (options) {
        case 'new': {
          let modalRef = this._dialog.open(this.newFolderModal);
          break;
        }
        case 'delete': {
          let modalRef = this._dialog.open(this.deleteConfirmModal);
          break;
        }
        case 'rename': {
          let modalRef = this._dialog.open(this.renameConfirmModal);
          break;
        }
        case 'share': {
          let modalRef = this._dialog.open(this.shareConfirmModal);
          break;
        }
        default: {
          break;
        }
      }
    } */

  rename(input: HTMLInputElement) {
    let newFso = this.currentFolder.children.find((elem) => elem.isSelected);
    if (newFso) {
      newFso.name = input.value;
      this.driveService.rename(newFso).subscribe();
    }
  }

  async uploadFile(files: FileList | null) {
    if (files) {
      let fileAlreadyExists = false;
      let totalSize = 0;
      const formData = new FormData();
      //let disk = await this.driveService.getUserDiskInfo().toPromise();
      let diskUsedBeforeUpload = this.disk.usedBytes;
      Array.from(files).map((file, index) => {
        if (this.currentFolder.children.find((elem) => elem.name === file.name))
          fileAlreadyExists = true;
        totalSize += file.size;
        return formData.append('file' + index, file, file.name);
      });
      if (fileAlreadyExists) {
        // this.toastService.show('Error', 'File already exists', 'bg-danger');
      } else if (totalSize + +this.disk.usedBytes > +this.disk.totalBytes) {
        // this.toastService.show('Error', 'Not enough space', 'bg-danger');
      } else if (totalSize > environment.maxUploadSize) {
        // this.toastService.show('Error', 'Max file(s) size 250MB', 'bg-danger');
      } else {
        formData.append('rootId', String(this.currentFolder.id));
        let uploadSubscription = this.driveService.upload(formData).subscribe(
          (event) => {
            if (event.type === HttpEventType.Response) {
              (<FsoModel[]>event.body).forEach((e) => {
                this.currentFolder.children.push(e);
              });

              this.progressBar.text = 'Completed';
              setTimeout(() => {
                this.progressBar.inProgress = false;
              }, 2000);
            } else if (
              event.type === HttpEventType.UploadProgress &&
              event.total
            ) {
              this.disk.usedBytes = +diskUsedBeforeUpload + +event.loaded;
              this.disk.diskUsed = Math.round(
                (this.disk.usedBytes * 100) / this.disk.totalBytes
              );
              this.progressBar.progress = Math.round(
                (100 * +event.loaded) / +event.total
              );
              this.progressBar.text = String(this.progressBar.progress) + '%';
              this.progressBar.loaded = event.loaded;
              this.progressBar.total = event.total;
              this.progressBar.background = 'success';
              this.progressBar.inProgress = true;
            }
            this.currentFolder.children.sort(this.sortedBy);
          },
          () => {
            this.progressBar.text = 'Error';
            this.progressBar.background = 'danger';
            setTimeout(() => {
              this.progressBar.inProgress = false;
            }, 2000);
          },
          () => {
            this.driveService
              .getUserDiskInfo()
              .pipe(
                tap((res) => {
                  this.disk = res;
                })
              )
              .subscribe();
            uploadSubscription.unsubscribe();
          }
        );
      }
    }
  }

  download() {
    let fsoIdArr: string[] = [];
    let fsoArr: FsoModel[] = [];
    this.currentFolder.children.forEach((elem) => {
      if (elem.isSelected) {
        fsoIdArr.push(String(elem.id!));
        fsoArr.push(elem);
      }
    });
    let downloadFileName = '';
    if (fsoArr.length == 1 && !fsoArr[0].isFolder)
      downloadFileName = fsoArr[0].name;
    else downloadFileName = `files-${Date.now()}`;

    this.driveService.download(fsoIdArr).subscribe(
      (event) => {
        if (event.type === HttpEventType.Response) {
          var FileSaver = require('file-saver');
          FileSaver.saveAs(<Blob>event.body, downloadFileName);
          this.progressBar.text = 'Completed';
          setTimeout(() => {
            this.progressBar.inProgress = false;
          }, 2000);
        } else if (
          event.type === HttpEventType.DownloadProgress &&
          event.total
        ) {
          this.progressBar.progress = Math.round(
            (100 * event.loaded) / event.total
          );
          this.progressBar.text = String(this.progressBar.progress) + '%';
          this.progressBar.loaded = event.loaded;
          this.progressBar.total = event.total;
          this.progressBar.background = 'info';
          this.progressBar.inProgress = true;
        }
      },
      () => {
        this.progressBar.text = 'Error';
        this.progressBar.background = 'danger';
        setTimeout(() => {
          this.progressBar.inProgress = false;
        }, 2000);
      }
    );
  }

  shareSelected() {
    let fsoIdArr: string[] = [];
    this.currentFolder.children.forEach((elem) => {
      if (elem.isSelected) {
        fsoIdArr.push(String(elem.id!));
      }
    });
    this.driveService.share(fsoIdArr).subscribe(shareId => {
      this.shareId = shareId;
    });
  }
  getShareUrl(shareId: string) {
    return this.driveService.getShareUrl(shareId);
  }
  copyUrl(input: HTMLInputElement) {
    input.focus();
    input.select();
    document.execCommand('copy');
    /* this.toastService.show(
      'Success',
      `Copied to clipboard`,
      'bg-success'
    ); */
  }

  deleteShare() {
    if (this.shareId)
      this.driveService.deleteShare(this.shareId).subscribe(res => {
        /* this.toastService.show(
          'Success',
          `Successfully deleted share: ${(<any>res).shareId}`,
          'bg-success'
        ); */
      })
  }

  sendShareEmail(input: HTMLInputElement, shareId: string) {
    this.driveService.sendShareEmail(shareId, input.value, this.getShareUrl(shareId)).subscribe(() => {
      /* this.toastService.show(
        'Success',
        `An email has been sent to ${input.value}`,
        'bg-success'
      ); */
    },
      () => {
        /* this.toastService.show(
          'Error',
          `Server error, unabel to send email`,
          'bg-danger'
        ); */
      }
    );
  }

  validateEmail(input: HTMLInputElement) {
    const regularExpression = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    this.validEmail = regularExpression.test(String(input.value).toLowerCase());
  }

  doAction(event: string) {
    switch (event) {
      case 'new': {
        this._dialog.open(this.newFolderDialog, {
          disableClose: false,
          hasBackdrop: true,
          maxHeight: '80vh',
          width: this.scrWidth > 768 ? '500px' : '80vw'
        }).afterClosed().subscribe((dialogResult: boolean) => {
          if (dialogResult) {
            this.addFolder(this.newFolderName);
          } else {
            this.newFolderName = '';
          }
        });
        break;
      }
      case 'upload': {
        console.log(this.scrWidth);

        this.inputFiles?.nativeElement.click();
        break;
      }
      case 'download': {
        this.download();
        break;
      }
      case 'delete': {
        //this.openModal('delete');
        break;
      }
      case 'rename': {
        //this.openModal('rename');
        break;
      }
      case 'sortName': {
        if (this.sortedBy === this.fsoSortService.sortByNameAscFn) {
          this.sorter.next(this.fsoSortService.sortByNameDescFn);
          this.sortedBy = this.fsoSortService.sortByNameDescFn;
        } else {
          this.sorter.next(this.fsoSortService.sortByNameAscFn);
          this.sortedBy = this.fsoSortService.sortByNameAscFn;
        }
        break;
      }
      case 'sortSize': {
        if (this.sortedBy === this.fsoSortService.sortBySizeAscFn) {
          this.sorter.next(this.fsoSortService.sortBySizeDescFn);
          this.sortedBy = this.fsoSortService.sortBySizeDescFn;
        } else {
          this.sorter.next(this.fsoSortService.sortBySizeAscFn);
          this.sortedBy = this.fsoSortService.sortBySizeAscFn;
        }
        break;
      }
      case 'sortDate': {
        if (this.sortedBy === this.fsoSortService.sortByDateAscFn) {
          this.sorter.next(this.fsoSortService.sortByDateDescFn);
          this.sortedBy = this.fsoSortService.sortByDateDescFn;
        } else {
          this.sorter.next(this.fsoSortService.sortByDateAscFn);
          this.sortedBy = this.fsoSortService.sortByDateAscFn;
        }
        break;
      }
      case 'changeView': {
        if (this.view === 'listView') {
          this.view = 'iconView';
          localStorage.setItem(`view`, 'iconView');
        } else {
          this.view = 'listView';
          localStorage.setItem(`view`, 'listView');
        }
        break;
      }
      case 'share': {
        // this.openModal('share');
        break;
      }
      case 'cut': {
        this.cutSelected();
        break;
      }
      case 'paste': {
        this.moveFromClipboard();
        break;
      }
      default: {
        break;
      }
    }
  }

  cutSelected() {
    let fsoIdArr: string[] = [];
    this.currentFolder.children.forEach((elem) => {
      if (elem.isSelected) {
        fsoIdArr.push(String(elem.id!));
      }
    });
    this.removeFsoFromUI(fsoIdArr);
    sessionStorage.setItem('clipboard', fsoIdArr.join(","));
    this._snackBar.open(`Moved to clipboard ${fsoIdArr.length} item(s)`, 'Ok', SNACKBAR_OPTIONS)
    /*     this.toastService.show(
          'Success',
          `Moved to clipboard ${fsoIdArr.length} item(s)`,
          'bg-success'
        ); */
  }

  moveFromClipboard() {
    let clipboard = sessionStorage.getItem('clipboard');
    if (clipboard) {
      let fsoIdArr: string[] = clipboard.split(",");
      this.driveService.move(fsoIdArr, this.currentFolder.id)
        .subscribe(data => {
          let successList: FsoModel[] = (<any>data).success;
          successList.forEach((elem) => {
            elem.isSelected = true;
          });
          let failList: FsoModel[] = (<any>data).fail;
          this.currentFolder.children = this.currentFolder.children.concat(successList);
          // this.sorter.next(this.sortedBy);

          if (failList.length > 0) {
            /*             this.toastService.show(
                          'Error',
                          `Unable to move ${failList.length} item(s)`,
                          'bg-danger'
                        ); */
          }
        });
      sessionStorage.removeItem('clipboard');
    }
  }

  checkFsoName(input: HTMLInputElement, keyEvent: KeyboardEvent) {
    if (this.validKeyCode(keyEvent.code)) {
      this.isFsoNameValid = true;
      let name = input.value.trim();
      if (name.length == 0) {
        this.isFsoNameValid = false;
      }
      if (name.slice(-1) == '.') {
        this.isFsoNameValid = false;
        /* this.toastService.show(
          'Error',
          'Name can\'t end in period',
          'bg-warning'
        ); */
      }
      if (this.forbiddenChar.some((c) => name.includes(c))) {
        this.isFsoNameValid = false;
        /* this.toastService.show(
          'Error',
          'Name contains invalid characters',
          'bg-warning'
        ); */
      }
      let fso = this.currentFolder.children.find(
        (elem) => elem.name.toLowerCase() === name.toLowerCase()
      );
      if (fso) {
        this.isFsoNameValid = false;
        /* this.toastService.show('Error', 'Already exists', 'bg-warning'); */
      }
    }
  }

  private resetFields() {
    this.isFsoNameValid = false;
    this.newFolderName = '';
    this.shareId = '';
    this.validEmail = false;
  }
  private between(x: number, val1: number, val2: number): boolean {
    if (val1 <= val2) return x >= val1 && x <= val2;
    else return x >= val2 && x <= val1;
  }

  private removeFsoFromUI(list: string[]) {
    list.forEach((id) => {
      let fso = this.currentFolder.children.find((elem) => elem.id == +id);
      if (fso) {
        let index = this.currentFolder.children.indexOf(fso);
        this.currentFolder.children.splice(index, 1);
      }
    });
  }
  private validKeyCode(code: string): boolean {
    let keyCodeArr = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'PageUp',
      'PageDown',
      'Home',
      'End',
      'Insert',
      'AltLeft',
      'ShiftLeft',
      'ControlLeft',
      'AltRight',
      'ControlRight',
      'ShiftRight',
      'PrintScreen',
      'ScrollLock',
      'Pause',
    ];
    if (keyCodeArr.includes(code)) return false;
    else return true;
  }
  get selectedCount() {
    return this.currentFolder?.children.filter(x => x.isSelected).length;
  }
}
