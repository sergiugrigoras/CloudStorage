import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, Subscription, debounceTime, forkJoin, fromEvent, map, switchMap, tap } from 'rxjs';
import { MediaObject } from 'src/app/model/media-object.model';
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
  overlayEventSubscription: Subscription;
  activeMediaObject: MediaObject;
  activeIndex: number;
  hideControls = false;
  @ViewChild('mediaViewDialog', { static: true }) mediaViewDialog: TemplateRef<any>;
  dialogConfig: MatDialogConfig = {
    maxWidth: '98vw',
    maxHeight: '98vh',
    hasBackdrop: true,
    disableClose: true,
  };
  dialogRef: MatDialogRef<any>;
  timer: NodeJS.Timer;

  constructor(
    private mediaService: MediaService,
    public breakpointObserver: BreakpointObserver,
    private overlay: OverlayContainer,
    private sanitizer: DomSanitizer,
    public dialog: MatDialog
  ) { }

  ngOnDestroy(): void {
    this.overlay.getContainerElement().classList.remove('media');
    if (this.overlayEventSubscription) {
      this.overlayEventSubscription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.overlayEventSubscription = fromEvent(this.overlay.getContainerElement(), 'click').subscribe(event => {
      this.hideControls = !this.hideControls;
    });
    this.overlay.getContainerElement().classList.add('media');
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

    this.mediaService.getAllMediaFiles()
      .pipe(
        tap((mediaObjects: MediaObject[]) => {
          this.allMediaObjects = mediaObjects;
          this.filteredMediaObjects = this.allMediaObjects.slice();
        }),
        switchMap(mediaObjects => {
          return forkJoin(mediaObjects.map(x => this.getSnapshotUrl(x.id)));
        }),
        tap(urls => {
          urls.forEach(url => {
            const mediaObject = this.getMediaObjectById(url.id);
            if (mediaObject) {
              mediaObject.snapshotUrl = url.safeUrl;
            }
          })
        })
      ).subscribe(() => {
        this.buildColumnsMap();
        this.mediaReady = true;
      });
  }
  isActiveVideo() {
    return this.activeMediaObject?.contentType.startsWith('video');
  }

  openMedia(id: string) {
    this.hideControls = false;
    this.mediaService.addContentAccesKeyCookie()
      .pipe(
        switchMap(() => {
          this.activeMediaObject = this.getMediaObjectById(id);
          this.activeIndex = this.filteredMediaObjects.indexOf(this.activeMediaObject);
          this.updateAccessKey();
          this.dialogRef = this.dialog.open(this.mediaViewDialog, this.dialogConfig);
          return this.dialogRef.afterClosed();
        }),
        switchMap(() => {
          window.clearTimeout(this.timer);
          this.activeMediaObject = null;
          return this.mediaService.removeContentAccesKey();
        })
      ).subscribe();
  }

  updateAccessKey() {
    this.timer = setInterval(() => {
      this.mediaService.addContentAccesKeyCookie().subscribe();
    }, KEY_UPDATE_INTERVAL_SECONDS * 1000);
  }


  closeDialog($event: MouseEvent) {
    $event.stopPropagation();
    this.dialogRef?.close();
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

  getSnapshotUrl(id: string) {
    return this.mediaService.getSnapshotFile(id).pipe(map(x => {
      const blob = x.body as Blob;
      const safeUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
      return { id, safeUrl }
    }));
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
    });
  }

  scrollBack($event: MouseEvent) {
    $event.stopPropagation();
    if (this.activeIndex === 0) {
      this.activeIndex = this.filteredMediaObjects.length - 1;
    } else {
      this.activeIndex--;
    }
    this.activeMediaObject = this.filteredMediaObjects[this.activeIndex];
  }

  scrollForward($event: MouseEvent) {
    $event.stopPropagation();
    if (this.activeIndex === this.filteredMediaObjects.length - 1) {
      this.activeIndex = 0;
    } else {
      this.activeIndex++;
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

}
