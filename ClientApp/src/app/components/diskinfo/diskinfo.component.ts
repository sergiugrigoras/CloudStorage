import { DiskInfoModel } from './../../interfaces/disk.interface';
import { Component, Input, OnInit } from '@angular/core';
import { ReadableBytesPipe } from '../../pipes/readable-bytes.pipe';

@Component({
    selector: 'diskinfo',
    templateUrl: './diskinfo.component.html',
    styleUrls: ['./diskinfo.component.css'],
    imports: [ReadableBytesPipe],
})
export class DiskinfoComponent implements OnInit {
  @Input('disk') disk: DiskInfoModel = { used: 0, total: 0, usedPercentage: '' };
  constructor() {}

  ngOnInit(): void {}
}
