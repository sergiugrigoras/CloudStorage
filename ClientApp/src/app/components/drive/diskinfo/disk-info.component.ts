import { DiskInfoModel } from '../../../interfaces/disk.interface';
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

@Component({
  selector: 'disk-info',
  templateUrl: './disk-info.component.html',
  styleUrls: ['./disk-info.component.scss'],
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
  ],
})
export class DiskInfoComponent {
  protected readonly data = inject(MAT_DIALOG_DATA);
  readonly diskInfo: DiskInfoModel;
  constructor() {
    this.diskInfo = this.data;
  }
}
