import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit {
  @Input('selectedCount') selectedCount: number = 0;
  @Output('action') action = new EventEmitter();
  buttons: ToolbarButton[] = [
    { label: 'New Folder', icon: 'create_new_folder', isDisabled: () => false, event: 'new' },
    { label: 'Upload File', icon: 'upload', isDisabled: () => false, event: 'upload' },
    { label: 'Sort by Name', icon: 'sort_by_alpha', isDisabled: () => false, event: 'sortName' },
    { label: 'Sort by Size', icon: 'filter_list', isDisabled: () => false, event: 'sortSize' },
    { label: 'Sort by Date', icon: 'sort', isDisabled: () => false, event: 'sortDate' },
    { label: 'Change View', icon: 'view_list', isDisabled: () => false, event: 'changeView' },
    { label: 'Download', icon: 'download', isDisabled: () => this.selectedCount === 0, event: 'download' },
    { label: 'Share', icon: 'share', isDisabled: () => this.selectedCount === 0, event: 'share' },
    { label: 'Delete', icon: 'delete_forever', isDisabled: () => this.selectedCount === 0, event: 'delete' },
    { label: 'Rename', icon: 'drive_file_rename_outline', isDisabled: () => this.selectedCount != 1, event: 'rename' },
    { label: 'Cut', icon: 'content_cut', isDisabled: () => this.selectedCount === 0, event: 'cut' },
    { label: 'Paste', icon: 'content_paste', isDisabled: () => this.isClipboardEmpty, event: 'paste' }
  ];

  /*
  <!-- <button type="button" class="btn" (click)="emitEvent('new')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" (click)="emitEvent('upload')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" (click)="emitEvent('sortName')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" (click)="emitEvent('sortSize')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" (click)="emitEvent('sortDate')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" (click)="emitEvent('changeView')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" [disabled]="selectedCount==0" (click)="emitEvent('download')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" [disabled]="selectedCount==0" (click)="emitEvent('share')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" [disabled]="selectedCount==0" (click)="emitEvent('delete')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" [disabled]="selectedCount!=1" (click)="emitEvent('rename')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" [disabled]="selectedCount==0" (click)="emitEvent('cut')">
        <mat-icon fontIcon="home"></mat-icon>
    </button>
    <button type="button" class="btn" [disabled]="isClipboardEmpty" (click)="emitEvent('paste')">
        <mat-icon fontIcon="home"></mat-icon>
    </button> -->
  */
  constructor() { }

  ngOnInit(): void {
  }

  emitEvent(val: string) {
    this.action.emit(val);
  }

  get isClipboardEmpty() {
    return sessionStorage.getItem('clipboard') == null ? true : false;
  }

  get clipboardCount() {
    if (!this.isClipboardEmpty)
      return sessionStorage.getItem('clipboard')?.split(',').length;
    return 0;
  }
}

export interface ToolbarButton {
  label: string,
  icon: string,
  isDisabled: any,
  event: string
}
