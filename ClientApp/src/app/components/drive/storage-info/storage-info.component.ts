import { IStorageInfo } from '../../../interfaces/disk.interface';
import { Component, inject } from '@angular/core';
import { ReadableBytesPipe } from '../../../pipes/readable-bytes.pipe';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { MatTooltip } from '@angular/material/tooltip';
import { NgClass } from '@angular/common';

@Component({
  selector: 'disk-info',
  templateUrl: './storage-info.component.html',
  styleUrls: ['./storage-info.component.scss'],
  imports: [
    ReadableBytesPipe,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatDialogClose,
    MatProgressBar,
    CdkDrag,
    CdkDragHandle,
    MatTooltip,
    NgClass,
  ],
})
export class StorageInfoComponent {
  protected readonly data = inject(MAT_DIALOG_DATA);
  readonly storageInfo: IStorageInfo;
  constructor() {
    this.storageInfo = this.data;
  }
}
