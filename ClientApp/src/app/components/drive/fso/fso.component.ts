import { StorageNode } from '../../../model/storage-node.model';
import { Component, Input } from '@angular/core';
import { NgStyle, DatePipe, NgClass } from '@angular/common';
import { ReadableBytesPipe } from '../../../pipes/readable-bytes.pipe';

@Component({
  selector: 'fso',
  templateUrl: './fso.component.html',
  styleUrls: ['./fso.component.scss'],
  imports: [NgStyle, DatePipe, ReadableBytesPipe, NgClass],
})
export class FsoComponent {
  @Input() fso?: StorageNode;
  @Input() text?: string;
  constructor() {}
}
