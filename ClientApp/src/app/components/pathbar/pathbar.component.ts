import { DriveService } from 'src/app/services/drive.service';
import { FsoModel } from './../../interfaces/fso.interface';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'pathbar',
  templateUrl: './pathbar.component.html',
  styleUrls: ['./pathbar.component.scss']
})
export class PathbarComponent implements OnInit, OnChanges {
  @Input('folder') folder: FsoModel;
  fullPathArr: FsoModel[] = [];
  constructor(private driveService: DriveService) {
  }

  ngOnInit(): void {

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
