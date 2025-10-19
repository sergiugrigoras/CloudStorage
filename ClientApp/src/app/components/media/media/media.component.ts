import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  Component,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  MatDialog,
  MatDialogConfig,
  MatDialogRef,
  MatDialogTitle,
  MatDialogContent,
  MatDialogActions,
  MatDialogClose,
} from '@angular/material/dialog';
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
  takeUntil,
  of,
  finalize,
} from 'rxjs';
import { MediaAlbum } from '../../../model/media-album.model';
import { MediaObject } from '../../../model/media-object.model';
import { MediaService } from '../../../services/media.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { buildUrl } from '../../../core/url-builder';
import { API_ENDPOINTS } from '../../../core/api-endpoints';
import { NgClass, AsyncPipe, DatePipe } from '@angular/common';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIconButton, MatButton } from '@angular/material/button';
import {
  MatDivider,
  MatSelectionList,
  MatListOption,
  MatListItemIcon,
  MatListItemTitle,
  MatListItemLine,
} from '@angular/material/list';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MediaItemComponent } from '../media-item/media-item.component';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatFormField, MatLabel, MatInput, MatError } from '@angular/material/input';
import { MatSelect, MatOption } from '@angular/material/select';
import { MatSelectSearchComponent } from 'ngx-mat-select-search';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';

const KEY_UPDATE_INTERVAL = 60000; // 1 minute
const SNACKBAR_OPTIONS = { duration: 3000 };
const LOAD_BY_DEFAULT_COUNT = 1;
type ColumnViewType = 'one-column' | 'two-columns' | 'three-columns';
@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss'],
  imports: [
    MatTooltip,
    MatIconButton,
    MatDivider,
    MatProgressBar,
    MediaItemComponent,
    MatProgressSpinner,
    MatDialogTitle,
    FormsModule,
    MatDialogContent,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatSelect,
    MatOption,
    MatSelectSearchComponent,
    NgClass,
    MatSelectionList,
    MatListOption,
    MatIcon,
    MatListItemIcon,
    MatListItemTitle,
    MatListItemLine,
    MatCheckbox,
    AsyncPipe,
    DatePipe,
  ],
})
export class MediaComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  public readonly breakpointObserver = inject(BreakpointObserver);
  private readonly dialog = inject(MatDialog);
  private readonly overlay = inject(OverlayContainer);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private allMediaObjects: MediaObject[] = [];
  displayedMediaObjects: MediaObject[] = [];
  mediaReady = false;
  columnView: ColumnViewType | null = null;
  twoColumns: MultipleColumnsCollection | null = null;
  threeColumns: MultipleColumnsCollection | null = null;
  activeMediaObject: MediaObject | null = null;
  activeIndex = -1;
  selectMode = false;
  private allAlbumDialogRef: MatDialogRef<unknown> | null = null;
  get maxScrollIndex() {
    return this.allMediaObjects.length - 1;
  }
  updateAccessKeyIntervalId?: number;
  uploading = false;
  uploadProgress = 0;
  @ViewChild('newAlbum', { static: true }) newAlbumDialog: TemplateRef<unknown> | null = null;
  @ViewChild('addToAlbum', { static: true }) addToAlbumDialog: TemplateRef<unknown> | null = null;
  @ViewChild('mediaViewDialog', { static: true }) mediaViewDialog: TemplateRef<unknown> | null =
    null;
  @ViewChild('allAlbums', { static: true }) allAlbumsDialog: TemplateRef<unknown> | null = null;
  @ViewChild('deleteConfirm', { static: true }) deleteDialog: TemplateRef<unknown> | null = null;
  albumFilterCtrl: FormControl<string | null> = new FormControl('');
  filteredAlbums$: ReplaySubject<MediaAlbum[]> = new ReplaySubject<MediaAlbum[]>(1);
  allMediaAlbums: MediaAlbum[] = [];
  allMediaAlbums$ = this.mediaService.getAllAlbums();
  newAlbumForm = new FormGroup({
    name: new FormControl(
      '',
      [Validators.required, Validators.minLength(5)],
      this.uniqueAlbumName.bind(this)
    ),
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
  dialogRef: MatDialogRef<unknown> | null = null;
  private readonly destroy$ = new Subject<void>();
  itemsLoaded = 0;
  intersectionObserver = new IntersectionObserver(
    (entries: IntersectionObserverEntry[]) => {
      const visible = entries.filter((x) => x.isIntersecting);
      this.loadItemsToView(visible.length);
      visible.forEach((x) => this.intersectionObserver.unobserve(x.target));
    },
    { threshold: 0 }
  );
  page: 'home' | 'album' | 'favorites' | 'trash' | null = null;
  albumName = '';
  deletePermanently = false;

  constructor() {}

  @HostListener('document:keydown', ['$event'])
  private keyListener(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape': {
        this.closeDialog();
        break;
      }
      case 'ArrowLeft': {
        this.scrollMediaBack();
        break;
      }
      case 'ArrowRight': {
        this.scrollMediaForward();
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
    this.mediaService.selectMode$.pipe(takeUntil(this.destroy$)).subscribe((selectMode) => {
      this.selectMode = selectMode;
    });
    location.hash = '';
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          this.mediaService.disableSelectMode();
          const page = params.get('page');
          const id = params.get('id');
          if (page === 'album' && id) {
            this.page = page;
            this.albumName = id;
            return this.mediaService.getAlbumContent(id);
          } else if (page === 'favorites') {
            this.page = page;
            return this.mediaService.getMediaFiles({ favorite: true, deleted: false });
          } else if (page === 'trash') {
            this.page = page;
            return this.mediaService.getMediaFiles({ deleted: true });
          } else {
            this.page = 'home';
            return this.mediaService.getMediaFiles({ deleted: false });
          }
        }),
        catchError((error) => {
          console.error(error);
          return EMPTY;
        }),
        tap((mediaObjects: MediaObject[]) => {
          this.allMediaObjects = mediaObjects.map((x) => new MediaObject(x));
          this.displayedMediaObjects = [];
          this.twoColumns = new MultipleColumnsCollection(2);
          this.threeColumns = new MultipleColumnsCollection(3);
          this.itemsLoaded = 0;
          this.loadItemsToView(LOAD_BY_DEFAULT_COUNT);
        }),
        tap(() => {
          this.mediaReady = true;
        })
      )
      .subscribe();

    fromEvent(document, 'mousewheel')
      .pipe(takeUntil(this.destroy$), throttleTime(150))
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
      .pipe(takeUntil(this.destroy$))
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
      .pipe(takeUntil(this.destroy$), debounceTime(250))
      .subscribe(() => {
        this.filterAlbums();
      });
  }

  uniqueAlbumName(control: AbstractControl): Observable<ValidationErrors | null> {
    return this.mediaService.albumUniqueName(control.value).pipe(
      map((result) => {
        if (result) return null;
        else return { shouldBeUnique: true };
      })
    );
  }

  get totalItems() {
    return this.allMediaObjects?.length;
  }
  get totalSelected() {
    return this.allMediaObjects.reduce(
      (sum: number, current: MediaObject) => (current.isSelected ? ++sum : sum),
      0
    );
  }

  loadItemsToView(count: number) {
    if (count === 0) return;
    const newItems = this.allMediaObjects.slice(this.itemsLoaded, this.itemsLoaded + count);
    this.displayedMediaObjects.push(...newItems);
    this.twoColumns?.addItems(...newItems);
    this.threeColumns?.addItems(...newItems);
    this.itemsLoaded = this.itemsLoaded + newItems.length;
  }
  openMedia(id: string) {
    location.hash = 'view';
    this.overlay.getContainerElement().classList.add('media');
    this.mediaService
      .addContentAccessKeyCookie()
      .pipe(
        switchMap(() => {
          this.activeMediaObject = this.getMediaObjectById(id);
          if (this.activeMediaObject == null) return EMPTY;
          this.activeIndex = this.displayedMediaObjects.indexOf(this.activeMediaObject);
          this.updateAccessKey();
          if (this.mediaViewDialog) {
            this.dialogRef = this.dialog.open(this.mediaViewDialog, this.viewDialogConfig);
            return this.dialogRef.afterClosed();
          }
          return EMPTY;
        }),
        switchMap(() => {
          if (location.hash === '#view') {
            history.back();
          }
          window.clearTimeout(this.updateAccessKeyIntervalId);
          this.activeMediaObject = null;
          this.overlay.getContainerElement().classList.remove('media');
          return this.mediaService.removeContentAccessKey();
        })
      )
      .subscribe();
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
    if (this.activeMediaObject == null) return;
    this.mediaService.toggleFavorite(this.activeMediaObject.id).subscribe((result) => {
      if (this.activeMediaObject) {
        this.activeMediaObject.favorite = result;
      }
    });
  }

  uploadFiles(input: HTMLInputElement) {
    if (input instanceof HTMLInputElement && input.files && input.files.length > 0) {
      this.uploading = true;
      const formData = new FormData();
      for (let i = 0; i != input.files.length; i++) {
        formData.append('files', input.files[i]);
      }
      this.mediaService
        .upload(formData)
        .pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress && event.total) {
              this.uploadProgress = Math.floor((event.loaded / event.total) * 100);
            }
          }),
          switchMap((event) => {
            if (event.type === HttpEventType.Response) {
              return this.snackBar
                .open(`Upload complete.`, 'Ok', SNACKBAR_OPTIONS)
                .afterDismissed()
                .pipe(map(() => true));
            } else {
              return of(false);
            }
          }),
          finalize(() => {
            this.uploading = false;
            this.uploadProgress = 0;
          })
        )
        .subscribe({
          next: (result) => {
            if (result) {
              window.location.reload();
            }
          },
          error: (error: HttpErrorResponse) => {
            console.error(error.error);
          },
        });
    }
  }

  createAlbum() {
    if (this.newAlbumDialog == null) return;
    this.dialog
      .open(this.newAlbumDialog, this.dialogConfig)
      .afterClosed()
      .subscribe((dialogResult: boolean | string) => {
        if (typeof dialogResult === 'string') {
          this.mediaService
            .createAlbum(dialogResult)
            .subscribe({ complete: () => this.newAlbumForm.reset() });
        }
        this.newAlbumForm.reset();
      });
  }

  addSelectedToAlbum() {
    const addToAlbumObserver = {
      next: () => {
        this.displayedMediaObjects.forEach((x) => (x.isSelected = false));
        this.snackBar.open(`Success.`, 'Ok', SNACKBAR_OPTIONS);
      },
      error: (error: unknown) => {
        console.error(error);
      },
    };

    this.mediaService
      .getAllAlbums()
      .pipe(
        retry(3),
        catchError((error) => {
          this.snackBar.open(`An error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          console.error(error);
          return EMPTY;
        }),
        switchMap((albums) => {
          this.allMediaAlbums = albums;
          this.filteredAlbums$.next(albums);
          if (this.addToAlbumDialog == null) return EMPTY;
          return this.dialog.open(this.addToAlbumDialog, this.dialogConfig).afterClosed();
        }),
        switchMap((dialogResult: unknown) => {
          if (Array.isArray(dialogResult) && dialogResult.length > 0) {
            const mediaObjectsIds = this.displayedMediaObjects
              .filter((x) => x.isSelected)
              .map((x) => x.id);
            const albumsIds = dialogResult.map((x: MediaAlbum) => x.id);
            return this.mediaService.addToAlbum({ albumsIds, mediaObjectsIds });
          }
          if (dialogResult === 'new') {
            this.createAlbum();
          }
          return EMPTY;
        })
      )
      .subscribe(addToAlbumObserver);
  }

  deleteSelected() {
    const ids = this.selectedItemsIds();
    if (ids.length === 0) return;
    const deleteObserver = {
      next: () => {
        window.location.reload();
      },
      error: (error: HttpErrorResponse) => {
        console.error(error);
        this.snackBar.open(`An error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      },
    };
    if (this.deleteDialog == null) return;
    this.dialog
      .open(this.deleteDialog, this.dialogConfig)
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult) {
            return this.mediaService.deleteMediaObjects(
              ids,
              this.page === 'trash' || this.deletePermanently
            );
          }
          this.deletePermanently = false;
          return EMPTY;
        })
      )
      .subscribe(deleteObserver);
  }

  restoreSelected() {
    const ids = this.selectedItemsIds();
    if (ids.length === 0) return;
    const restoreObserver = {
      next: () => {
        window.location.reload();
      },
      error: (error: HttpErrorResponse) => {
        console.error(error);
        this.snackBar.open(`An error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      },
    };
    this.mediaService.restoreMediaObjects(ids).subscribe(restoreObserver);
  }

  private selectedItemsIds() {
    return this.allMediaObjects.filter((x) => x.isSelected).map((x) => x.id);
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
    return this.allMediaObjects.find((m) => m.id === id) ?? null;
  }

  newAlbumErrorMessage() {
    const controlErrors = this.newAlbumForm.get('name')?.errors;
    if (controlErrors == null) return '';
    if (controlErrors['required']) return 'Name is required.';
    if (controlErrors['minlength'])
      return `At least ${controlErrors['minlength'].requiredLength} characters long.`;
    if (controlErrors['shouldBeUnique']) return 'Name is not unique.';
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
      this.allMediaAlbums.filter((album) => album.name.toLowerCase().indexOf(search) > -1)
    );
  }

  showAlbumsList() {
    if (this.allAlbumsDialog == null) return;
    this.allAlbumDialogRef = this.dialog.open(this.allAlbumsDialog, this.dialogConfig);
    this.allAlbumDialogRef.afterClosed().subscribe((result) => {
      if (result instanceof MediaAlbum) {
        void this.router.navigate(['/media', 'album', result.name]);
      } else if (result === 'favorites') {
        void this.router.navigate(['/media', 'favorites']);
      } else if (result === 'home') {
        void this.router.navigate(['/media']);
      } else if (result === 'trash') {
        void this.router.navigate(['/media', 'trash']);
      }
    });
  }

  navigateToAlbum(album: MediaAlbum | string) {
    this.allAlbumDialogRef?.close(album);
  }

  selectAll() {
    this.allMediaObjects.forEach((x) => (x.isSelected = true));
  }

  deselectAll() {
    this.allMediaObjects.forEach((x) => (x.isSelected = false));
    this.mediaService.disableSelectMode();
  }

  enableSelectMode() {
    this.mediaService.enableSelectMode();
  }

  getPageName() {
    switch (this.page) {
      case 'home':
        return 'Home';
      case 'favorites':
        return 'Favorite';
      case 'trash':
        return 'Trash';
      case 'album':
        return this.albumName;
      default:
        return '';
    }
  }

  buildContentUrl(id: string | undefined) {
    if (id) return buildUrl(API_ENDPOINTS.CONTENT.BASE, id);
    return undefined;
  }
}

export class MultipleColumnsCollection {
  private readonly numberOfColumns: number;
  private readonly columns: Array<Array<MediaObject>>;
  private readonly offsets: number[];

  constructor(numberOfColumns: number) {
    this.numberOfColumns = numberOfColumns;
    this.columns = Array.from({ length: numberOfColumns }, (): MediaObject[] => []);
    this.offsets = Array(numberOfColumns).fill(0);
  }

  addItems(...items: MediaObject[]) {
    for (const item of items) {
      const index = this.smallestColumnIndex();
      this.columns[index].push(item);
      this.offsets[index] = this.offsets[index] + item.height / item.width;
    }
  }

  getColumn(index: number) {
    if (index >= this.numberOfColumns) return undefined;
    return this.columns[index];
  }

  private smallestColumnIndex(): number {
    return this.offsets.indexOf(Math.min(...this.offsets));
  }
}
