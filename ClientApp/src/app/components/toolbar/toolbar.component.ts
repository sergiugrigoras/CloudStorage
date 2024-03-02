import {Component, Input, OnInit, Output, EventEmitter, ViewChild, OnDestroy} from '@angular/core';
import {MatMenu} from "@angular/material/menu";
import {DriveService} from "../../services/drive.service";
import {Subject, takeUntil} from "rxjs";

@Component({
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent implements OnInit, OnDestroy {
  constructor(private driveService: DriveService) {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.driveService.clipboard$.pipe(takeUntil(this.destroy$))
      .subscribe(clipboard => {
        this.clipboardValues = clipboard;
      });
  }
  private readonly destroy$ = new Subject<void>();
  clipboardValues: number[] = [];
  @Input('selectedCount') selectedCount: number = 0;
  @Output('action') action = new EventEmitter<string>();
  buttons: ToolbarButton[] = [
    { label: 'New Folder', icon: 'create_new_folder', isDisabled: () => false, badgeValue: () => {}, event: 'new' },
    { label: 'Upload File', icon: 'upload', isDisabled: () => false, badgeValue: () => {}, event: 'upload' },
    { label: 'Sort', icon: 'sort', isDisabled: () => false, badgeValue: () => {}, menu: 'sort-menu' },
    // { label: 'Change View', icon: 'view_list', isDisabled: () => false, event: 'changeView' },
    { label: 'Download', icon: 'download', isDisabled: () => this.selectedCount === 0, badgeValue: () => {}, event: 'download' },
    { label: 'Delete', icon: 'delete_forever', isDisabled: () => this.selectedCount === 0, badgeValue: () => {}, event: 'delete' },
    { label: 'Rename', icon: 'drive_file_rename_outline', isDisabled: () => this.selectedCount != 1, badgeValue: () => {}, event: 'rename' },
    { label: 'Cut', icon: 'content_cut', isDisabled: () => this.selectedCount === 0, badgeValue: () => {}, event: 'cut' },
    { label: 'Paste', icon: 'content_paste', isDisabled: () => this.isClipboardEmpty, badgeValue: () => this.clipboardCount, event: 'paste' }
  ];

  emitEvent(val: string) {
    if (val) this.action.emit(val);
  }

  get isClipboardEmpty() {
    return this.clipboardValues.length === 0;
  }

  get clipboardCount() {
    if (this.clipboardValues.length === 0) return undefined;
    return this.clipboardValues.length;
  }
}

export interface ToolbarButton {
  label: string,
  icon: string,
  isDisabled: any,
  event?: string
  menu?: string,
  badgeValue?: any
}
