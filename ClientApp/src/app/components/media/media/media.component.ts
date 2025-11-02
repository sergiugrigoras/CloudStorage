import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  TemplateRef,
  ViewChild,
  WritableSignal,
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
  finalize,
  filter,
  timer,
  concatWith,
  Subscription,
  combineLatest,
} from 'rxjs';
import { MediaAlbum } from '../../../model/media-album.model';
import { MediaObject, MediaObjectFilter } from '../../../model/media-object.model';
import { MediaService } from '../../../services/media.service';
import { ActivatedRoute, Router } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NgClass, AsyncPipe, DatePipe, TitleCasePipe } from '@angular/common';
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
import { StorageInfoComponent } from '../../drive/storage-info/storage-info.component';
import { MatPaginator } from '@angular/material/paginator';
import { take } from 'rxjs/operators';
import { DomSanitizer } from '@angular/platform-browser';

const KEY_UPDATE_INTERVAL = 60000; // 1 minute
const SNACKBAR_OPTIONS = { duration: 3000 };
const PREFETCH_COUNT = 4;
const DEFAULT_PAGE_SIZE = 50;
type MediaPage = 'home' | 'album' | 'favorites' | 'trash';
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
    MatPaginator,
    TitleCasePipe,
  ],
})
export class MediaComponent implements OnInit, OnDestroy, AfterViewInit {
  private mediaService = inject(MediaService);
  private readonly dialog = inject(MatDialog);
  private readonly overlay = inject(OverlayContainer);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  protected readonly allMediaObjects: WritableSignal<MediaObject[]> = signal([]);
  protected readonly selectedItems = computed(() => [
    ...this.allMediaObjects().filter((x) => x.isSelected()),
  ]);

  protected readonly mediaReady = signal(false);
  protected readonly activeMediaObject: WritableSignal<MediaObject | null> = signal(null);
  protected readonly activeIndex = signal(-1);
  protected readonly selectMode = this.mediaService.selectMode;

  private allAlbumDialogRef: MatDialogRef<unknown> | null = null;
  private touchEventSubscription?: Subscription;
  protected readonly maxScrollIndex = computed(() =>
    Math.max(0, this.allMediaObjects().length - 1)
  );
  protected readonly uploading = signal(false);
  protected readonly uploadProgress = signal(0);
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
    closeOnNavigation: true,
  };
  dialogRef: MatDialogRef<unknown> | null = null;
  private readonly destroy$ = new Subject<void>();
  protected readonly mediaPage: WritableSignal<MediaPage | null> = signal(null);
  protected readonly albumName = signal('');
  deletePermanently = false;
  protected readonly defaultPageSize = DEFAULT_PAGE_SIZE;
  protected readonly paginatorPage = new Subject<number>();
  protected readonly refreshPageContent = new Subject<void>();
  protected readonly displayObjects: WritableSignal<MediaObject[]> = signal([]);
  constructor() {}
  ngAfterViewInit(): void {
    this.enableTouchEvents();
  }

  private enableTouchEvents() {
    const overlayContainer = this.overlay.getContainerElement();
    if (overlayContainer === null) return;

    const touchStart$ = fromEvent<TouchEvent>(overlayContainer, 'touchstart').pipe(
      takeUntil(this.destroy$),
      filter(() => this.activeIndex() >= 0)
    );

    const touchEnd$ = fromEvent<TouchEvent>(overlayContainer, 'touchend').pipe(
      takeUntil(this.destroy$),
      filter(() => this.activeIndex() >= 0)
    );

    this.touchEventSubscription = touchStart$
      .pipe(
        switchMap((start) =>
          touchEnd$.pipe(
            take(1),
            map((end) => [start, end])
          )
        )
      )
      .subscribe(([start, end]) => {
        const startTouch = start.touches[0];
        const endTouch = end.changedTouches[0];
        const dx = endTouch.clientX - startTouch.clientX;
        const dy = endTouch.clientY - startTouch.clientY;
        const HORIZONTAL_THRESHOLD = 50;
        const VERTICAL_THRESHOLD = 100;
        const swipeLeft = dx < 0;
        const swipeRight = dx > 0;
        const swipeUp = dy < 0;
        const horizontalGesture =
          Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > HORIZONTAL_THRESHOLD;
        const verticalGesture = Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > VERTICAL_THRESHOLD;
        if (horizontalGesture) {
          if (swipeLeft) {
            this.scrollMediaForward();
          } else if (swipeRight) {
            this.scrollMediaBack();
          }
        } else if (verticalGesture) {
          if (swipeUp) {
            this.closeDialog();
          }
        }
      });
  }

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
    this.touchEventSubscription?.unsubscribe();
    for (const { contentObjectUrl, snapshotObjectUrl } of this.allMediaObjects()) {
      if (contentObjectUrl) URL.revokeObjectURL(contentObjectUrl);
      if (snapshotObjectUrl) URL.revokeObjectURL(snapshotObjectUrl);
    }
  }

  ngOnInit(): void {
    const pageFiltersMap: Record<string, MediaObjectFilter> = {
      favorites: { favorite: true, deleted: false },
      trash: { deleted: true },
      home: { deleted: false },
    };

    combineLatest([this.paginatorPage, this.refreshPageContent])
      .pipe(
        takeUntil(this.destroy$),
        tap(([pageNumber]) => {
          const from = pageNumber * DEFAULT_PAGE_SIZE;
          const to = from + DEFAULT_PAGE_SIZE;
          this.displayObjects.set(this.allMediaObjects().slice(from, to));
        })
      )
      .subscribe();

    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          this.selectMode.set(false);

          const page = (params.get('page') as MediaPage | null) ?? 'home';
          const id = params.get('id');
          if (id) {
            this.albumName.set(id);
          }
          this.mediaPage.set(page);

          if (page === 'album' && id) {
            return this.mediaService.getAlbumContent(id);
          }

          return this.mediaService.getMediaFiles(pageFiltersMap[page] ?? { deleted: false });
        }),
        catchError((error) => {
          console.error(error);
          return EMPTY;
        }),
        tap((mediaObjects: MediaObject[]) => {
          const result = mediaObjects.map((x) => new MediaObject(x));
          this.allMediaObjects.set([...result]);
          this.paginatorPage.next(0);
          this.refreshPageContent.next();
        }),
        tap(() => {
          this.mediaReady.set(true);
        })
      )
      .subscribe();

    fromEvent(document, 'wheel')
      .pipe(
        takeUntil(this.destroy$),
        throttleTime(150),
        filter(() => this.activeMediaObject() != null)
      )
      .subscribe((event: Event) => {
        const wheelEvent = event as WheelEvent;
        if (wheelEvent.deltaY > 0) {
          this.scrollMediaBack();
        } else {
          this.scrollMediaForward();
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

  openMedia(id: string) {
    if (!this.tryPrepareViewDialog(id)) {
      return;
    }

    this.mediaService
      .addContentAccessKeyCookie()
      .pipe(
        switchMap(() => {
          if (!this.mediaViewDialog) return EMPTY;
          if (!history.state?.mediaView) {
            history.pushState({ mediaView: true }, '', window.location.href);
          }
          this.dialogRef = this.dialog.open(this.mediaViewDialog, this.viewDialogConfig);
          return this.updateAccessKey(this.dialogRef.afterClosed());
        }),
        finalize(() => {
          this.destroyViewDialog();
        })
      )
      .subscribe();
  }

  private updateAccessKey(stop$: Observable<unknown>) {
    return timer(KEY_UPDATE_INTERVAL, KEY_UPDATE_INTERVAL).pipe(
      takeUntil(stop$),
      switchMap(() => this.mediaService.addContentAccessKeyCookie()),
      concatWith(this.mediaService.removeContentAccessKey())
    );
  }

  private tryPrepareViewDialog(mediaObjectId: string): boolean {
    const index = this.allMediaObjects().findIndex((x) => x.id === mediaObjectId);
    if (index === -1) {
      return false;
    }
    const mediaObject = this.allMediaObjects()[index];
    if (mediaObject == null) return false;

    this.activeIndex.set(index);
    this.activeMediaObject.set(mediaObject);

    this.overlay.getContainerElement().classList.add('media');

    this.tryLoadContent(index, Math.floor(PREFETCH_COUNT / 2), Math.floor(PREFETCH_COUNT / 2));

    return true;
  }

  private tryLoadContent(index: number, leftRange: number, rightRange: number) {
    const start = Math.max(0, index - leftRange);
    const end = Math.min(this.maxScrollIndex(), index + rightRange);

    for (let i = start; i <= end; i++) {
      if (i === index) continue;
      this.loadMediaObjectContent(this.allMediaObjects()[i]);
    }
  }

  private loadMediaObjectContent(mediaObject: MediaObject) {
    if (mediaObject.contentSafeValue || mediaObject.isVideo) return;
    this.mediaService
      .getMediaFile(mediaObject.id)
      .pipe(
        retry(3),
        catchError(() => {
          return EMPTY;
        }),
        tap((response) => {
          if (response?.body) {
            const url = URL.createObjectURL(response.body);
            mediaObject.contentSafeValue = this.sanitizer.bypassSecurityTrustUrl(url);
            mediaObject.contentObjectUrl = url;
          }
        })
      )
      .subscribe();
  }

  private destroyViewDialog() {
    this.activeMediaObject.set(null);
    this.activeIndex.set(-1);
    this.overlay.getContainerElement().classList.remove('media');
  }

  closeDialog($event?: MouseEvent) {
    $event?.stopPropagation();
    this.dialogRef?.close();
  }

  favoriteToggle($event: MouseEvent) {
    $event.stopPropagation();
    const active = this.activeMediaObject();
    if (active == null) return;

    this.mediaService.toggleFavorite(active.id).subscribe((result) => {
      active.favorite = result;
    });
  }

  uploadFiles(input: HTMLInputElement) {
    if (
      !(input instanceof HTMLInputElement) ||
      input.files == null ||
      input.files.length === 0 ||
      this.mediaPage() !== 'home'
    )
      return;
    const fileArray = Array.from(input.files);
    const totalUploadSize = fileArray.reduce((a, b) => a + b.size, 0);
    this.uploading.set(true);
    const formData = new FormData();
    for (let i = 0; i != input.files.length; i++) {
      formData.append('files', input.files[i]);
    }
    this.mediaService
      .getStorageInfo()
      .pipe(
        catchError(() => {
          this.snackBar.open('Unable to get disk status', 'Ok', { duration: 3000 });
          return EMPTY;
        }),
        switchMap((storageInfo) => {
          if (
            storageInfo == null ||
            storageInfo.totalUsed + totalUploadSize > storageInfo.storageSize
          ) {
            throw new Error('Not enough space.');
          }
          const formData = new FormData();
          for (const file of fileArray) {
            formData.append('files', file, file.name);
          }
          return this.mediaService.upload(formData);
        }),
        tap((event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress.set(Math.floor((event.loaded / event.total) * 100));
          } else if (event.type === HttpEventType.Response) {
            const uploadResult = event.body ?? [];
            const newItems = this.pushMediaObjects(uploadResult);
            const message = `Upload completed. Added ${newItems} item${newItems !== 1 ? 's' : ''}.`;
            this.snackBar.open(message, 'Ok', SNACKBAR_OPTIONS);

            this.refreshPageContent.next();
          }
        }),
        catchError((err) => {
          let text = 'An error occurred';
          if (err instanceof HttpErrorResponse && typeof err.error === 'string') {
            text = err.status === 413 ? 'Request entity too large.' : err.error;
          } else if (typeof err.message === 'string') {
            text = err.message;
          }
          this.snackBar.open(text, 'Ok');
          return EMPTY;
        }),
        finalize(() => {
          this.uploading.set(false);
          this.uploadProgress.set(0);
          input.value = '';
        })
      )
      .subscribe();
  }

  private pushMediaObjects(mediaObjects: MediaObject[]): number {
    let newItems = 0;
    const currentValuesMap = new Map(
      this.allMediaObjects().map((mediaObject) => {
        return [mediaObject.id, mediaObject];
      })
    );

    for (const newMediaObject of mediaObjects) {
      if (currentValuesMap.has(newMediaObject.id)) continue;
      currentValuesMap.set(newMediaObject.id, new MediaObject(newMediaObject));
      newItems++;
    }

    this.allMediaObjects.set([...currentValuesMap.values()]);
    return newItems;
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
        this.allMediaObjects().forEach((x) => x.isSelected.set(false));
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
            const mediaObjectsIds = this.allMediaObjects()
              .filter((x) => x.isSelected())
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
    const ids = this.selectedItems().map((x) => x.id);
    if (ids.length === 0) return;

    if (this.deleteDialog == null) return;
    this.dialog
      .open(this.deleteDialog, this.dialogConfig)
      .afterClosed()
      .pipe(
        switchMap((dialogResult) => {
          if (dialogResult) {
            return this.mediaService.deleteMediaObjects(
              ids,
              this.mediaPage() === 'trash' || this.deletePermanently
            );
          }
          this.deletePermanently = false;
          return EMPTY;
        }),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && typeof error.error === 'string') {
            console.error(error);
          }
          this.snackBar.open(`An error occurred.`, 'Ok', SNACKBAR_OPTIONS);
          return EMPTY;
        }),
        tap((result) => {
          this.allMediaObjects.update((value) => [...value.filter((x) => !result.includes(x.id))]);
          this.refreshPageContent.next();
        })
      )
      .subscribe();
  }

  restoreSelected() {
    if (this.selectedItems().length === 0) return;
    const restoreObserver = {
      next: () => {
        window.location.reload();
      },
      error: (error: HttpErrorResponse) => {
        console.error(error);
        this.snackBar.open(`An error occurred.`, 'Ok', SNACKBAR_OPTIONS);
      },
    };
    this.mediaService
      .restoreMediaObjects(this.selectedItems().map((x) => x.id))
      .subscribe(restoreObserver);
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
    if (this.activeIndex() >= this.maxScrollIndex()) {
      return;
    }
    this.activeIndex.update((value) => value + 1);
    this.activeMediaObject.set(this.allMediaObjects()[this.activeIndex()]);
    this.tryLoadContent(this.activeIndex(), 0, PREFETCH_COUNT);
  }

  private scrollMediaBack() {
    if (this.activeIndex() === 0) {
      return;
    }
    this.activeIndex.update((value) => value - 1);
    this.activeMediaObject.set(this.allMediaObjects()[this.activeIndex()]);
    this.tryLoadContent(this.activeIndex(), PREFETCH_COUNT, 0);
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
    this.allMediaObjects().forEach((x) => x.isSelected.set(true));
  }

  deselectAll() {
    this.allMediaObjects().forEach((x) => x.isSelected.set(false));
    this.selectMode.set(false);
  }

  getStorageInfo() {
    this.mediaService
      .getStorageInfo()
      .pipe(
        tap((storageInfo) => {
          this.dialog.open(StorageInfoComponent, {
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
