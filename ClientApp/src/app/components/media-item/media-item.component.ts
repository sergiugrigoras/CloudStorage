import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, map, switchMap, tap } from 'rxjs';
import { MediaObject } from 'src/app/model/media-object.model';
import { MediaService } from 'src/app/services/media.service';

@Component({
  selector: 'app-media-item',
  templateUrl: './media-item.component.html',
  styleUrls: ['./media-item.component.scss']
})
export class MediaItemComponent implements OnInit {
  @Input() mediaObject: MediaObject;
  @ViewChild('mediaViewDialog', { static: true }) mediaViewDialog: TemplateRef<any>;

  contentUrl: string;
  isVideo = false;
  videoSource$: Observable<Blob>;
  dialogConfig: MatDialogConfig = {
    hasBackdrop: true,
    maxWidth: '98vw',
    maxHeight: '98vh',
    disableClose: false
  };
  timer: NodeJS.Timer;
  constructor(
    public mediaService: MediaService,
    private sanitizer: DomSanitizer,
    public dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.contentUrl = `/api/content/${this.mediaObject?.id}`;
    if (this.mediaObject.contentType.startsWith('video')) {
      this.isVideo = true;
    }
    this.getSnapshot(this.mediaObject.id).subscribe(url => {
      this.mediaObject.snapshotUrl = url;
    });
  }

  openMedia(id: string) {
    this.mediaService.addContentAccesKeyCookie()
      .pipe(
        switchMap(() => {
          this.updateAccessKey();
          return this.dialog.open(this.mediaViewDialog, this.dialogConfig).afterClosed();
        }),
        tap(() => {
          window.clearTimeout(this.timer);
        })
      ).subscribe();
  }

  getSnapshot(id: string) {
    return this.mediaService.getSnapshotFile(id).pipe(map(x => {
      const blob = x.body as Blob;
      return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    }));
  }

  updateAccessKey() {
    this.timer = setInterval(() => {
      this.mediaService.addContentAccesKeyCookie().subscribe();
    }, 30000);
  }

  videoControl(video: HTMLMediaElement) {
    return;
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
}
