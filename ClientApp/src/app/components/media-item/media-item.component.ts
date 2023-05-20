import { Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
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
  dialogConfig: MatDialogConfig = {
    hasBackdrop: true,
    maxWidth: '98vw',
    maxHeight: '98vh',
    disableClose: false
  };
  dialogRef: MatDialogRef<any>;
  timer: NodeJS.Timer;
  constructor(
    public mediaService: MediaService,
    public dialog: MatDialog
  ) {
  }

  ngOnInit(): void {
    this.contentUrl = `/api/content/${this.mediaObject?.id}`;
    if (this.mediaObject.contentType.startsWith('video')) {
      this.isVideo = true;
    }
  }

  openMedia(id: string) {
    this.mediaService.addContentAccesKeyCookie()
      .pipe(
        switchMap(() => {
          this.updateAccessKey();
          this.dialogRef = this.dialog.open(this.mediaViewDialog, this.dialogConfig)
          return this.dialogRef.afterClosed();
        }),
        switchMap(() => {
          window.clearTimeout(this.timer);
          return this.mediaService.removeContentAccesKey();
        })
      ).subscribe();
  }

  updateAccessKey() {
    if (!this.isVideo) return;
    this.timer = setInterval(() => {
      this.mediaService.addContentAccesKeyCookie().subscribe();
    }, 60000);
  }


  closeDialog() {
    this.dialogRef?.close();
  }

  favoriteToggle() {
    this.mediaService.toggleFavorite(this.mediaObject.id).subscribe((result) => {
      this.mediaObject.favorite = result;
      this.mediaService.updateList$.next(true);
    })
  }
}
