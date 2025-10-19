import { FsoModel } from '../../../model/fso.model';
import { Component, Input } from '@angular/core';
import { NgStyle, DatePipe } from '@angular/common';
import { ReadableBytesPipe } from '../../../pipes/readable-bytes.pipe';

@Component({
  selector: 'fso',
  templateUrl: './fso.component.html',
  styleUrls: ['./fso.component.scss'],
  imports: [NgStyle, DatePipe, ReadableBytesPipe],
})
export class FsoComponent {
  @Input() fso: FsoModel | null = null;
  @Input() text: string | null = null;
  constructor() {}
  protected getFileExtension = FsoModel.getFileExtension;
}
