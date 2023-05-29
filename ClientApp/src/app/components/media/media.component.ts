import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { DomSanitizer } from '@angular/platform-browser';
import { EMPTY, catchError, debounceTime, forkJoin, fromEvent, retry, tap } from 'rxjs';
import { MediaObject, SnapshotUrl } from 'src/app/model/media-object.model';
import { MediaService } from 'src/app/services/media.service';

const KEY_UPDATE_INTERVAL_SECONDS = 60;
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
  sectionView: string;
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
  constructor(
    private mediaService: MediaService,
    public breakpointObserver: BreakpointObserver,
    private sanitizer: DomSanitizer,
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
        }),
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
      if (this.sectionView === 'favorite') {
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

  sectionViewChanged($event: MatButtonToggleChange) {
    this.sectionView = $event.value;
    if ($event.value === 'favorite') {
      this.filteredMediaObjects = this.allMediaObjects.filter(x => x.favorite);
    } else {
      this.filteredMediaObjects = this.allMediaObjects.slice();
    }

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

  scrollBack($event: MouseEvent) {
    $event.stopPropagation();
    this.scrollMediaBack();
  }

  scrollForward($event: MouseEvent) {
    $event.stopPropagation();
    this.scrollMediaForward();
  }

  toVideoTime(duration: number) {
    var minutes = Math.floor(duration / 60000);
    var seconds = Math.floor((duration % 60000) / 1000);
    return (
      seconds == 60 ?
        (minutes + 1) + ":00" :
        minutes + ":" + (seconds < 10 ? "0" : "") + seconds
    );
  }

  private scrollMediaForward() {
    if (this.activeIndex === this.filteredMediaObjects.length - 1) {
      this.activeIndex = 0;
    } else {
      this.activeIndex++;
    }
    this.activeMediaObject = this.filteredMediaObjects[this.activeIndex];
    console.log(this.activeIndex);

  }

  private scrollMediaBack() {
    if (this.activeIndex === 0) {
      this.activeIndex = this.filteredMediaObjects.length - 1;
    } else {
      this.activeIndex--;
    }
    this.activeMediaObject = this.filteredMediaObjects[this.activeIndex];
    console.log(this.activeIndex);
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

}
