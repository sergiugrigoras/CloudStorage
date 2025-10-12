import { ProgressBarModel } from '../../interfaces/progress-bar.interface';
import { Component, Input, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { ReadableBytesPipe } from '../../pipes/readable-bytes.pipe';

@Component({
  selector: 'progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.css', '../diskinfo/diskinfo.component.css'],
  imports: [NgIf, ReadableBytesPipe],
})
export class UploadProgressComponent implements OnInit {
  @Input('progressBar') progressBar: ProgressBarModel = {
    progress: 0,
    text: '',
    inProgress: false,
    loaded: 0,
    total: 0,
    background: 'success',
  };

  constructor() {}

  ngOnInit(): void {}
}
