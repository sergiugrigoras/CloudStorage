import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { MatButtonToggleChange } from '@angular/material/button-toggle';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { forkJoin, map, switchMap } from 'rxjs';
import { MediaObject } from 'src/app/model/media-object.model';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-media',
  templateUrl: './media.component.html',
  styleUrls: ['./media.component.scss']
})
export class MediaComponent implements OnInit, OnDestroy {
  videoSource: any;
  videoType: string;

  allMediaObjects: MediaObject[] = [];
  filteredMediaObjects: MediaObject[];
  mediaReady = false;
  columnView: string;
  sectionView: string;
  twoColumnsViewMap: Map<number, MediaObject[]>;
  threeColumnsViewMap: Map<number, MediaObject[]>;
  constructor(
    private mediaService: MediaService,
    public breakpointObserver: BreakpointObserver,
    private overlay: OverlayContainer
  ) { }

  ngOnDestroy(): void {
    this.overlay.getContainerElement().classList.remove('media');
  }

  ngOnInit(): void {
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
      .subscribe(result => {
        this.allMediaObjects = result;
        this.filteredMediaObjects = this.allMediaObjects.slice();
        this.buildColumnsMap();
        this.mediaReady = true;
      });
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

    for (let index = 0; index < this.allMediaObjects.length; index = index + 1) {
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
    /*     if ($event.value === 'favorite') {
          this.filteredMediaObjects = this.allMediaObjects.filter(x => x.favorite);
        } else {
          this.filteredMediaObjects = this.allMediaObjects.slice();
        }
    
        this.buildColumnsMap(); */
  }

  parseFolder() {
    console.log('Starting folder Parse!');
    this.mediaService.parseFolder().subscribe(() => {
      console.log('Parse done!');
    });
  }

}
