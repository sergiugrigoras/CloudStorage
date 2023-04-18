import { Component, Input, OnInit } from '@angular/core';
import { FsoModel } from 'src/app/interfaces/fso.interface';

@Component({
  selector: 'shared-fso',
  templateUrl: './shared-fso.component.html',
  styleUrls: ['./shared-fso.component.css']
})
export class SharedFsoComponent implements OnInit {
  @Input('fso') fso: FsoModel;
  isOpen = false;

  constructor() { }

  ngOnInit(): void {
  }

  onClick() {
    this.isOpen = !this.isOpen;
  }

}
