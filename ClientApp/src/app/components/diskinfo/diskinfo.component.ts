import { DiskModel } from './../../interfaces/disk.interface';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'diskinfo',
  templateUrl: './diskinfo.component.html',
  styleUrls: ['./diskinfo.component.css']
})
export class DiskinfoComponent implements OnInit {
  @Input('disk') disk: DiskModel = { usedBytes: 0, totalBytes: 0, diskUsed: 0 }
  constructor() { }

  ngOnInit(): void {
  }

  getBgType() {
    return (this.disk.diskUsed <= 70) ? 'success' : (this.disk.diskUsed <= 90) ? 'warning' : 'danger';
  }

}
