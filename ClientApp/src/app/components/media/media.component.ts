import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import {Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import {MatDialog, MatDialogConfig, MatDialogRef} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  EMPTY,
  Observable,
  catchError,
  debounceTime,
  fromEvent,
  map,
  retry,
  switchMap,
  tap,
  ReplaySubject,
  throttleTime,
  Subject,
  takeUntil
} from 'rxjs';
import { MediaAlbum } from 'src/app/model/media-album.model';
import { MediaObject } from 'src/app/model/media-object.model';
import { MediaService } from 'src/app/services/media.service';
import {ActivatedRoute, Router} from "@angular/router";
import { OverlayContainer } from "@angular/cdk/overlay";

const KEY_UPDATE_INTERVAL = 60000; // 1 minute
const SNACKBAR_OPTIONS = { duration: 3000 };
const LOAD_BY_DEFAULT_COUNT = 1;
@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss']
})
export class MediaComponent implements OnInit, OnDestroy {
  private allMediaObjects: MediaObject[] = [];
  displayedMediaObjects: MediaObject[];
  mediaReady = false;
  columnView: string;
  twoColumns: MultipleColumnsCollection;
  threeColumns: MultipleColumnsCollection;
  activeMediaObject: MediaObject;
  activeIndex: number;
  selectMode: boolean;
  private allAlbumDialogRef: MatDialogRef<never, any>;
  get maxScrollIndex() {
    return this.allMediaObjects.length - 1;
  }
  updateAccessKeyIntervalId: number;
  uploading = false;
  uploadProgress = 0;
  favoriteFilter: boolean;
  @ViewChild('newAlbum', { static: true }) newAlbumDialog: TemplateRef<never>;
  @ViewChild('addToAlbum', { static: true }) addToAlbumDialog: TemplateRef<never>;
  @ViewChild('mediaViewDialog', { static: true }) mediaViewDialog: TemplateRef<never>;
  @ViewChild('allAlbums', { static: true }) allAlbumsDialog: TemplateRef<never>;
  albumFilterCtrl: FormControl<string> = new FormControl<string>('');
  filteredAlbums$: ReplaySubject<MediaAlbum[]> = new ReplaySubject<MediaAlbum[]>(1);
  allMediaAlbums: MediaAlbum[];
  allMediaAlbums$ = this.mediaService.getAllAlbums();
  newAlbumForm = new FormGroup({
    name: new FormControl('', [Validators.required, Validators.minLength(5)], this.uniqueAlbumName.bind(this))
  });
  dialogConfig: MatDialogConfig = {
    width: '500px',
    disableClose: false,
    hasBackdrop: true,
  };

  viewDialogConfig: MatDialogConfig = {
    maxWidth: '98vw',
    maxHeight: '98vh',
    hasBackdrop: true,
    disableClose: true,
  };
  dialogRef: MatDialogRef<any>;
  private readonly destroy$ = new Subject<void>();
  itemsLoaded: number;
  intersectionObserver = new IntersectionObserver((entries: IntersectionObserverEntry[]) => {
    const visible = entries.filter(x => x.isIntersecting);
    this.loadItemsToView(visible.length);
    visible.forEach(x => this.intersectionObserver.unobserve(x.target));
  }, {threshold: 0});

  constructor(
    private mediaService: MediaService,
    public breakpointObserver: BreakpointObserver,
    private dialog: MatDialog,
    private overlay: OverlayContainer,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
  ) { }

  @HostListener('document:keydown', ['$event'])
  private keyListener(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape' : {
        this.closeDialog();
        break;
      }
      case 'ArrowLeft': {
        this.scrollMediaBack();
        break;
      }
      case 'ArrowRight': {
        this.scrollMediaForward()
        break;
      }
      default:
        break;
    }
  }

  ngOnDestroy(): void {
    this.overlay.getContainerElement().classList.remove('media');
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.mediaService.selectMode$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(selectMode => {
      this.selectMode = selectMode;
    });
    location.hash = '';
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap(params => {
          this.mediaService.disableSelectMode();
          if (params.get('page') === 'album' && params.get('id')) {
            this.favoriteFilter = true;
            return this.mediaService.getAlbumContent(params.get('id'));
          } else if (params.get('page') === 'favorites') {
            this.favoriteFilter = true;
            return this.mediaService.getAllMediaFiles(this.favoriteFilter);
          } else {
            this.favoriteFilter = false;
            return this.mediaService.getAllMediaFiles(this.favoriteFilter);
          }
        }),
        catchError(error => {
          console.error(error);
          return EMPTY;
        }),
        tap((mediaObjects: MediaObject[]) => {
          this.allMediaObjects = mediaObjects.map(x => new MediaObject(x));
          this.displayedMediaObjects = [];
          this.twoColumns = new MultipleColumnsCollection(2);
          this.threeColumns = new MultipleColumnsCollection(3);
          this.itemsLoaded = 0;
          this.loadItemsToView(LOAD_BY_DEFAULT_COUNT);
        }),
        tap(() => {
          this.mediaReady = true;
        }),
      ).subscribe();

    fromEvent(document, 'mousewheel')
      .pipe(
        takeUntil(this.destroy$),
        throttleTime(150))
      .subscribe((event: Event) => {
      const wheelEvent = event as WheelEvent;
      if (wheelEvent.deltaY > 0) {
        this.scrollMediaBack();
      } else {
        this.scrollMediaForward();
      }
    });

    this.breakpointObserver
      .observe(['(min-width: 1200px)', '(max-width: 768px)'])
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe((state: BreakpointState) => {
        if (!state.matches) {
          this.columnView = 'two-columns';
        } else if (state.matches && state.breakpoints['(max-width: 768px)']) {
          this.columnView = 'one-column';
        } else if (state.matches && state.breakpoints['(min-width: 1200px)']) {
          this.columnView = 'three-columns';
        }
      });

    this.albumFilterCtrl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(250)
      )
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
    return this.allMediaObjects.reduce((sum: number, current: MediaObject) => current.isSelected ? ++sum : sum, 0)
  }

  loadItemsToView(count: number) {
    if (count === 0) return;
    const newItems = this.allMediaObjects.slice(this.itemsLoaded, this.itemsLoaded + count);
    this.displayedMediaObjects.push(...newItems);
    this.twoColumns.addItems(...newItems);
    this.threeColumns.addItems(...newItems);
    this.itemsLoaded = this.itemsLoaded + newItems.length;
  }
  openMedia(id: string) {
    location.hash = 'view';
    this.overlay.getContainerElement().classList.add('media');
    this.mediaService.addContentAccessKeyCookie()
      .pipe(
        switchMap(() => {
          this.activeMediaObject = this.getMediaObjectById(id);
          this.activeIndex = this.displayedMediaObjects.indexOf(this.activeMediaObject);
          this.updateAccessKey();
          this.dialogRef = this.dialog.open(this.mediaViewDialog, this.viewDialogConfig);
          return this.dialogRef.afterClosed();
        }),
        switchMap(() => {
          if (location.hash === '#view') {
            history.back();
          }
          window.clearTimeout(this.updateAccessKeyIntervalId);
          this.activeMediaObject = null;
          this.overlay.getContainerElement().classList.remove('media');
          return this.mediaService.removeContentAccesKey();
        })
      ).subscribe();
  }

  private updateAccessKey() {
    this.updateAccessKeyIntervalId = window.setInterval(() => {
      this.mediaService.addContentAccessKeyCookie().subscribe();
    }, KEY_UPDATE_INTERVAL);
  }

  closeDialog($event?: MouseEvent) {
    $event?.stopPropagation();
    this.dialogRef?.close();
  }

  favoriteToggle($event: MouseEvent) {
    $event.stopPropagation();
    this.mediaService.toggleFavorite(this.activeMediaObject.id).subscribe((result) => {
      this.activeMediaObject.favorite = result;
    });
  }

  parseFolder() {
    this.mediaService.parseFolder().subscribe(() => {
      console.log('Done.');
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
            this.snackBar.open(`Upload complete.`, 'Ok', SNACKBAR_OPTIONS);
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
        this.displayedMediaObjects.forEach(x => x.isSelected = false);
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
          const mediaObjectsIds = this.displayedMediaObjects.filter(x => x.isSelected).map(x => x.id);
          const albumsIds = dialogResult.map((x: MediaAlbum) => x.id);
          return this.mediaService.addToAlbum({ albumsIds, mediaObjectsIds });
        }
        if (dialogResult === 'new') {
          this.createAlbum();
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
    if (this.activeIndex >= this.maxScrollIndex) {
      return;
    }
    if (this.activeIndex === this.displayedMediaObjects.length - 1) {
      this.loadItemsToView(LOAD_BY_DEFAULT_COUNT);
    }
    this.activeMediaObject = this.displayedMediaObjects[++this.activeIndex];
  }

  private scrollMediaBack() {
    if (this.activeIndex === 0) {
      return;
    }
    this.activeMediaObject = this.displayedMediaObjects[--this.activeIndex];
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

  showAlbumsList() {
    this.allAlbumDialogRef = this.dialog.open(this.allAlbumsDialog, this.dialogConfig);
    this.allAlbumDialogRef.afterClosed()
      .subscribe(result => {
        if (result instanceof MediaAlbum) {
          void this.router.navigate(['/media', 'album', result.name]);
        } else if (result === 'favorites') {
          void this.router.navigate(['/media', 'favorites']);
        } else if (result === 'home') {
          void this.router.navigate(['/media']);
        }
    });
  }

  navigateToAlbum(album: MediaAlbum | string) {
    this.allAlbumDialogRef?.close(album);
  }

  selectAll() {
    this.allMediaObjects.forEach(x => x.isSelected = true);
  }

  deselectAll() {
    this.allMediaObjects.forEach(x => x.isSelected = false);
    this.mediaService.disableSelectMode();
  }
}

export class MultipleColumnsCollection {
  private readonly numberOfColumns: number;
  private readonly columns: Array<Array<MediaObject>>;
  private readonly offsets: number[];

  constructor(numberOfColumns: number) {
    this.numberOfColumns = numberOfColumns;
    this.columns = Array(numberOfColumns).fill(undefined).map(() => []);
    this.offsets = Array(numberOfColumns).fill(0);
  }

  addItems(...items: MediaObject[]) {
    for (let item of items) {
      const index = this.smallestColumnIndex();
      this.columns[index].push(item);
      this.offsets[index] = this.offsets[index] + (item.height/item.width);
    }
  }

  getColumn(index: number) {
    if (index >= this.numberOfColumns) return undefined;
    return this.columns[index];
  }

  private smallestColumnIndex(): number  {
    return this.offsets.indexOf(Math.min(...this.offsets));
  }
}
