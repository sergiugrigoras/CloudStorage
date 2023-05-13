import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
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
  mediaReady = false;
  view: string;
  twoColumnsViewMap: Map<number, MediaObject[]>;
  threeColumnsViewMap: Map<number, MediaObject[]>;
  constructor(
    private mediaService: MediaService,
    public breakpointObserver: BreakpointObserver
  ) { }

  ngOnDestroy(): void {
    throw new Error('Method not implemented.');
  }

  ngOnInit(): void {
    this.breakpointObserver
      .observe(['(min-width: 1200px)', '(max-width: 768px)'])
      .subscribe((state: BreakpointState) => {
        if (!state.matches) {
          this.view = 'two-columns';
        } else if (state.matches && state.breakpoints['(max-width: 768px)']) {
          this.view = 'one-column';
        } else if (state.matches && state.breakpoints['(min-width: 1200px)']) {
          this.view = 'three-columns';
        }
      });

    this.mediaService.getAllMediaFiles()
      .subscribe(result => {
        this.allMediaObjects = result;
        this.buildColumnsMap();
        this.mediaReady = true;
      });

    /*     this.mediaService.getMediaFile("ca3ac314-9ee3-4f16-86e8-de78f054c04c").subscribe(result => {
          console.log(result);
          const blob = result.body as Blob;
          this.videoType = blob.type;
          this.videoSource = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
          //var url = URL.createObjectURL(blob);
          // this.thumbnail = this.sanitizer.bypassSecurityTrustUrl(url);
        }); */
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
      this.twoColumnsViewMap.get(index % 2).push(this.allMediaObjects[index]);
      this.threeColumnsViewMap.get(index % 3).push(this.allMediaObjects[index]);
    }
  }

  getMediaForColumn(numberOfColumns: number, columnIndex: number) {
    if (numberOfColumns === 2) {
      return this.twoColumnsViewMap.get(columnIndex);
    } else if (numberOfColumns === 3) {
      return this.threeColumnsViewMap.get(columnIndex);
    } else {
      return this.allMediaObjects;
    }
  }

  parseFolder() {
    console.log('Starting folder Parse!');
    this.mediaService.parseFolder().subscribe(() => {
      console.log('Parse done!');
    });
  }
}
