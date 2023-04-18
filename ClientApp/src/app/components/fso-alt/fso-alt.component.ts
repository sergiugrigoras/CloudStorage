import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FsoModel } from 'src/app/interfaces/fso.interface';

@Component({
  selector: 'fso-alt',
  templateUrl: './fso-alt.component.html',
  styleUrls: ['./fso-alt.component.css']
})
export class FsoAltComponent implements OnInit {
  ext: string = '';
  @Input('fso') fso: FsoModel;


  @Output('touched') touched = new EventEmitter();
  @Output('open') open = new EventEmitter();
  constructor() { }

  ngOnInit(): void {
    this.ext = this.fso.name.split('.').pop()!.toUpperCase();
  }

  onClick(event: any) {
    this.fso.isSelected = !this.fso.isSelected;
    this.touched.emit({
      id: this.fso.id,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey
    });
  }

  onDblClick() {
    if (this.fso.isFolder)
      this.open.emit({
        id: this.fso.id,
      });
  }

}
