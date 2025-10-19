import { ProgressBarModel } from '../../../interfaces/progress-bar.interface';
import { Component, Input } from '@angular/core';
import { ReadableBytesPipe } from '../../../pipes/readable-bytes.pipe';

@Component({
  selector: 'progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.css', '../diskinfo/disk-info.component.scss'],
  imports: [ReadableBytesPipe],
})
export class UploadProgressComponent {
  @Input() progressBar: ProgressBarModel = {
    progress: 0,
    text: '',
    inProgress: false,
    loaded: 0,
    total: 0,
    background: 'success',
  };

  constructor() {}
}
