import { FsoModel } from '../../model/fso.model';
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'fso',
  templateUrl: './fso.component.html',
  styleUrls: ['./fso.component.scss']
})
export class FsoComponent implements OnInit {

  fileExtension: string;
  @Input('fso') fso: FsoModel;
  @Input('text') text: string;
  constructor() { }

  ngOnInit(): void {
    this.setFileExtension();
  }

  setFileExtension() {
    if (this.fso == null || this.fso.isFolder) {
      this.fileExtension = '';
    } else {
      const splitName = this.fso.name.split('.');
      if (splitName.length > 1) {
        this.fileExtension = splitName.pop().toUpperCase();
      } else {
        this.fileExtension = '';
      }
    }
  }
}
