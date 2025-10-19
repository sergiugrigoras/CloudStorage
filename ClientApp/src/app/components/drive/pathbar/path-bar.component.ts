import { DriveService } from '../../../services/drive.service';
import { FsoModel } from '../../../model/fso.model';
import { Component, inject, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'path-bar',
  templateUrl: './path-bar.component.html',
  styleUrls: ['./path-bar.component.scss'],
  imports: [],
})
export class PathBarComponent implements OnChanges {
  private readonly driveService = inject(DriveService);
  @Input() folder: FsoModel | null = null;
  fullPathArr: FsoModel[] = [];
  constructor() {}

  ngOnChanges(changes: SimpleChanges) {
    const folderId = (changes['folder'].currentValue as FsoModel).id;
    this.driveService.getFullPath(folderId).subscribe((result) => {
      this.fullPathArr = result.map((x) => new FsoModel(x));
    });
  }

  openFolder(id: number) {
    this.driveService.openFolder$.next(id);
  }
}
