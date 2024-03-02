import { DriveService } from 'src/app/services/drive.service';
import { FsoModel } from '../../model/fso.model';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'pathbar',
  templateUrl: './pathbar.component.html',
  styleUrls: ['./pathbar.component.scss']
})
export class PathbarComponent implements OnChanges {
  @Input('folder') folder: FsoModel;
  fullPathArr: FsoModel[] = [];
  constructor(private driveService: DriveService) {
  }


  ngOnChanges(changes: SimpleChanges) {
    const folderId = (changes['folder'].currentValue as FsoModel).id;
    this.driveService.getFullPath(folderId).subscribe(result => {
      this.fullPathArr = result.map(x => new FsoModel(x));
    });
  }

  openFolder(id: number) {
    this.driveService.openFolder$.next(id);
  }

}
