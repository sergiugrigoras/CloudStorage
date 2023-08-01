import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DomSanitizer } from '@angular/platform-browser';
import {
  EMPTY,
  Observable,
  catchError,
  debounceTime,
  forkJoin,
  fromEvent,
  map,
  retry,
  switchMap,
  tap,
  ReplaySubject
} from 'rxjs';
import { MediaAlbum } from 'src/app/model/media-album.model';
import { MediaObject, SnapshotUrl } from 'src/app/model/media-object.model';
import { MediaService } from 'src/app/services/media.service';

const KEY_UPDATE_INTERVAL_SECONDS = 60;
const SNACKBAR_OPTIONS = { duration: 3000 };
@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss']
})
export class MediaComponent implements OnInit, OnDestroy {
  private allMediaObjects: MediaObject[] = [];
  filteredMediaObjects: MediaObject[];
  mediaReady = false;
  columnView: string;
  favoriteFilter = false;
  videoFilter = true;
  pictureFilter = true;


  twoColumnsViewMap: Map<number, MediaObject[]>;
  threeColumnsViewMap: Map<number, MediaObject[]>;
  activeMediaObject: MediaObject;
  activeIndex: number;
  hideControls = false;
  viewMedia = false;
  timer: NodeJS.Timer;
  uploading = false;
  uploadProgress = 0;
  currentScroll = 0;
  snapshotUrls: Map<string, SnapshotUrl> = new Map<string, SnapshotUrl>();
  @ViewChild('newAlbum', { static: true }) newAlbumDialog: TemplateRef<never>;
  @ViewChild('addToAlbum', { static: true }) addToAlbumDialog: TemplateRef<never>;
  albumFilterCtrl: FormControl<string> = new FormControl<string>('');
  filteredAlbums$: ReplaySubject<MediaAlbum[]> = new ReplaySubject<MediaAlbum[]>(1);
  allMediaAlbums: MediaAlbum[];
  newAlbumForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(5)], this.uniqueAlbumName.bind(this))
  });
  dialogConfig: MatDialogConfig<any> = {
    width: '500px',
    disableClose: false,
    hasBackdrop: true,
  };
  constructor(
    private mediaService: MediaService,
    public breakpointObserver: BreakpointObserver,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) { }

  ngOnDestroy(): void {

  }

  ngOnInit(): void {
    fromEvent(document, 'mousewheel').pipe(debounceTime(250)).subscribe((event: Event) => {
      if (!this.viewMedia) return;
      const wheelEvent = event as WheelEvent;
      if (wheelEvent.deltaY > 0) {
        this.scrollMediaBack();
      } else {
        this.scrollMediaForward();
      }

    });
    this.breakpointObserver
      .observe(['(min-width: 1200px)', '(max-width: 768px)'])
      .subscribe((state: BreakpointState) => {
        if (!state.matches) {
          this.columnView = 'two-columns';
        } else if (state.matches && state.breakpoints['(max-width: 768px)']) {
          this.columnView = 'one-column';
        } else if (state.matches && state.breakpoints['(min-width: 1200px)']) {
          this.columnView = 'three-columns';
        }
      });

    this.fetchMediaObjects();

    this.albumFilterCtrl.valueChanges
      .pipe(debounceTime(250))
      .subscribe(() => {
        this.filterAlbums();
      });
  }

  uniqueAlbumName(control: AbstractControl): Observable<ValidationErrors | null> {
    return this.mediaService.albumUniqueName(control.value)
      .pipe(map(result => {
        if (result) return null;
        else return { shouldBeUnique: true }
      }));
  }

  get totalItems() {
    return this.allMediaObjects?.length;
  }
  get totalSelected() {
    return this.filteredMediaObjects.reduce((sum: number, current: MediaObject) => current.isSelected ? ++sum : sum, 0)
  }

  private fetchMediaObjects() {
    this.mediaReady = false;
    const allMediaObserver = {
      next: () => { },
      error: (error: any) => {
        console.error(error);
        this.mediaReady = true;
      },
      complete: () => {
        this.buildColumnsMap();
        this.mediaReady = true;
        this.fetchSnapshots();
      }
    }

    this.mediaService.getAllMediaFiles()
      .pipe(
        tap((mediaObjects: MediaObject[]) => {
          this.allMediaObjects = mediaObjects.map(x => new MediaObject(x));
          this.filteredMediaObjects = this.allMediaObjects.slice();
        })
      ).subscribe(allMediaObserver);
  }

  openMedia(id: string) {
    this.currentScroll = window.scrollY;
    this.hideControls = false;

    this.mediaService.addContentAccesKeyCookie()
      .pipe(
        tap(() => {
          this.activeMediaObject = this.getMediaObjectById(id);
          this.activeIndex = this.filteredMediaObjects.indexOf(this.activeMediaObject);
          this.updateAccessKey();
          this.viewMedia = true;
        }))
      .subscribe();
  }

  updateAccessKey() {
    this.timer = setInterval(() => {
      this.mediaService.addContentAccesKeyCookie().subscribe();
    }, KEY_UPDATE_INTERVAL_SECONDS * 1000);
  }


  @HostListener('document:keydown', ['$event'])
  private escKeyListner(event: KeyboardEvent) {
    if (event.key === "Escape" && this.viewMedia) {
      this.closeDialog();
    }
  }

  closeDialog($event?: MouseEvent) {
    $event?.stopPropagation();
    this.viewMedia = false;
    setTimeout(() => {
      window.scrollTo(0, this.currentScroll);
    }, 25);
    window.clearTimeout(this.timer);
    this.activeMediaObject = null;
    this.mediaService.removeContentAccesKey().subscribe();
  }

  favoriteToggle($event: MouseEvent) {
    $event.stopPropagation();
    this.mediaService.toggleFavorite(this.activeMediaObject.id).subscribe((result) => {
      this.activeMediaObject.favorite = result;
      if (this.favoriteFilter) {
        this.filteredMediaObjects = this.allMediaObjects.filter(x => x.favorite);
        this.buildColumnsMap();
      }
    })
  }

  fetchSnapshots() {
    const snapshot = (mediaObject: MediaObject) => this.mediaService.getSnapshotFile(mediaObject.id)
      .pipe(
        retry(3),
        catchError((error: any) => {
          return EMPTY;
        }),
        tap(response => {
          const blob = response.body as Blob;
          const url = URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustUrl(url);
          this.snapshotUrls.set(mediaObject.id, { url, safeUrl });
          mediaObject.snapshot$.next(safeUrl);
          mediaObject.snapshot$.complete();
        }));

    forkJoin(this.filteredMediaObjects.map(mediaObject => snapshot(mediaObject))).subscribe();
  }

  buildColumnsMap() {
    this.twoColumnsViewMap = new Map<number, MediaObject[]>([
      [0, []],
      [1, []],
    ]);
    this.threeColumnsViewMap = new Map<number, MediaObject[]>([
      [0, []],
      [1, []],
      [2, []],
    ]);

    for (let index = 0; index < this.filteredMediaObjects.length; index = index + 1) {
      this.twoColumnsViewMap.get(index % 2).push(this.filteredMediaObjects[index]);
      this.threeColumnsViewMap.get(index % 3).push(this.filteredMediaObjects[index]);
    }
  }

  getMediaForColumn(numberOfColumns: number, columnIndex: number) {
    if (numberOfColumns === 2) {
      return this.twoColumnsViewMap.get(columnIndex);
    } else if (numberOfColumns === 3) {
      return this.threeColumnsViewMap.get(columnIndex);
    } else {
      return this.filteredMediaObjects;
    }
  }

  filterChanged() {
    let filtered = this.allMediaObjects.slice();
    if (this.favoriteFilter) {
      filtered = this.allMediaObjects.filter(x => x.favorite);
    }
    if (!this.videoFilter) {
      filtered = filtered.filter(x => !x.isVideo());
    }
    if (!this.pictureFilter) {
      filtered = filtered.filter(x => x.isVideo());
    }
    this.filteredMediaObjects = filtered;
    this.buildColumnsMap();
  }

  parseFolder() {
    console.log('Starting folder Parse!');
    this.mediaService.parseFolder().subscribe(() => {
      console.log('Parse done!');
      this.fetchMediaObjects();
    });
  }

  uploadFiles(input: HTMLInputElement) {
    if (input instanceof HTMLInputElement && input.files.length > 0) {
      this.uploading = true;
      const formData = new FormData();
      for (var i = 0; i != input.files.length; i++) {
        formData.append("files", input.files[i]);
      }
      const uploadObserver = {
        next: (event: HttpEvent<Object>) => {
          if (event.type === HttpEventType.Response) {
            this.fetchMediaObjects();
          }
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress = Math.floor((event.loaded / event.total) * 100);
          }
        },
        error: (error: any) => {
          console.error(error);
          this.uploading = false;
          this.uploadProgress = 0;
        },
        complete: () => {
          this.uploading = false;
          this.uploadProgress = 0;
        }
      }
      this.mediaService.upload(formData).subscribe(uploadObserver);
    }
  }

  createAlbum() {
    this.dialog.open(this.newAlbumDialog, this.dialogConfig).afterClosed().subscribe((dialogResult: boolean | string) => {
      if (typeof dialogResult === 'string') {
        this.mediaService.createAlbum(dialogResult).subscribe({ complete: () => this.newAlbumForm.reset() });
      }
      this.newAlbumForm.reset();
    });
  }

  addSelectedToAlbum() {
    const addToAlbumObserver = {
      next: () => {
        this.filteredMediaObjects.forEach(x => x.isSelected = false);
        this.snackBar.open(`Success.`, 'Ok', SNACKBAR_OPTIONS);
      },
      error: (error: unknown) => {
        console.error(error);
      }
    };

    this.mediaService.getAllAlbums().pipe(
      retry(3),
      catchError(error => {
        this.snackBar.open(`An error occurred.`, 'Ok', SNACKBAR_OPTIONS);
        console.error(error);
        return EMPTY;
      }),
      switchMap(albums => {
        this.allMediaAlbums = albums;
        this.filteredAlbums$.next(albums);
        return this.dialog.open(this.addToAlbumDialog, this.dialogConfig).afterClosed();
      }),
      switchMap((dialogResult: unknown) => {
        if (Array.isArray(dialogResult) && dialogResult.length > 0) {
          const mediaObjectsIds = this.filteredMediaObjects.filter(x => x.isSelected).map(x => x.id);
          const albumsIds = dialogResult.map((x: MediaAlbum) => x.id);
          return this.mediaService.addToAlbum({ albumsIds, mediaObjectsIds });
        }
        return EMPTY;
      })
    ).subscribe(addToAlbumObserver);
  }

  scrollBack($event: MouseEvent) {
    $event.stopPropagation();
    this.scrollMediaBack();
  }

  scrollForward($event: MouseEvent) {
    $event.stopPropagation();
    this.scrollMediaForward();
  }

  private scrollMediaForward() {
    if (this.activeIndex === this.filteredMediaObjects.length - 1) {
      this.activeIndex = 0;
    } else {
      this.activeIndex++;
    }
    this.activeMediaObject = this.filteredMediaObjects[this.activeIndex];
  }

  private scrollMediaBack() {
    if (this.activeIndex === 0) {
      this.activeIndex = this.filteredMediaObjects.length - 1;
    } else {
      this.activeIndex--;
    }
    this.activeMediaObject = this.filteredMediaObjects[this.activeIndex];
  }

  getFavoriteControlClassList() {
    if (this.hideControls) {
      return 'control--invisible';
    } else if (this.activeMediaObject?.favorite) {
      return 'control--pink'
    } else {
      return '';
    }
  }

  private getMediaObjectById(id: string) {
    return this.allMediaObjects.find(m => m.id === id);
  }

  newAlbumErrorMessage() {
    const controlErrors = this.newAlbumForm.get('name').errors;
    if (controlErrors == null) return '';
    if (controlErrors['required']) return 'Name is required.';
    if (controlErrors['minlength']) return `At least ${controlErrors['minlength'].requiredLength} characters long.`
    if (controlErrors['shouldBeUnique']) return 'Name is not unique.'
    return '';
  }

  private filterAlbums() {
    let search = this.albumFilterCtrl.value;
    if (!search) {
      this.filteredAlbums$.next(this.allMediaAlbums.slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredAlbums$.next(
      this.allMediaAlbums.filter(album => album.name.toLowerCase().indexOf(search) > -1)
    );
  }
}
