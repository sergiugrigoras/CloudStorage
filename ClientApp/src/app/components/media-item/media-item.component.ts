import { Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { map, switchMap, tap } from 'rxjs';
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
  blobUrl: SafeUrl;
  mediaFileUnsafeUrl: string;
  animated = false;
  constructor(
    private mediaService: MediaService,
    private sanitizer: DomSanitizer,
    public dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    if (this.mediaObject.contentType.startsWith('video')) {
      this.animated = true;
    }
    this.getSnapshot(this.mediaObject.id).subscribe(url => {
      this.mediaObject.snapshotUrl = url;
    });
  }

  openMedia(id: string) {
    let dialogRef: MatDialogRef<any>;
    this.getMediaFile(id)
      .pipe(
        tap(safeUrl => this.blobUrl = safeUrl),
        switchMap(() => {
          const dialogRef = this.dialog.open(this.mediaViewDialog, {
            hasBackdrop: true,
            maxWidth: '98vw',
            maxHeight: '98vh',
            disableClose: false
          });
          return dialogRef.afterClosed()
        })
      )
      .subscribe(() => {
        URL.revokeObjectURL(this.mediaFileUnsafeUrl)
      });
  }

  getSnapshot(id: string) {
    return this.mediaService.getSnapshotFile(id).pipe(map(x => {
      const blob = x.body as Blob;
      return this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob));
    }));
  }

  getMediaFile(id: string) {
    return this.mediaService.getMediaFile(id)
      .pipe(map(x => {
        const blob = x.body as Blob;
        this.mediaFileUnsafeUrl = URL.createObjectURL(blob);
        return this.sanitizer.bypassSecurityTrustUrl(this.mediaFileUnsafeUrl);
      }))
  }

  videoControl(video: HTMLMediaElement) {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  }
}
