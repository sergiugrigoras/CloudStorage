import { DriveService } from '../../../services/drive.service';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { ISimpleNode } from '../../../model/storage-node.model';

@Component({
  selector: 'path-bar',
  templateUrl: './path-bar.component.html',
  styleUrls: ['./path-bar.component.scss'],
  imports: [],
})
export class PathBarComponent {
  private readonly driveService = inject(DriveService);
  @Input() path: ISimpleNode[] = [];
  @Output() open = new EventEmitter<string | null>();
  constructor() {}

  openFolder(id: string | null) {
    this.open.emit(id);
  }
}
