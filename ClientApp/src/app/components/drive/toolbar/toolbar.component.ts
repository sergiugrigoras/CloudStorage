import { Component, Input, OnInit, Output, EventEmitter, OnDestroy, inject } from '@angular/core';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { DriveService } from '../../../services/drive.service';
import { Subject, takeUntil } from 'rxjs';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatBadge } from '@angular/material/badge';

@Component({
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  imports: [MatIconButton, MatTooltip, MatMenuTrigger, MatBadge, MatMenu, MatMenuItem],
})
export class ToolbarComponent implements OnInit, OnDestroy {
  private readonly driveService = inject(DriveService);
  constructor() {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.driveService.clipboard$.pipe(takeUntil(this.destroy$)).subscribe((clipboard) => {
      this.clipboardValues = clipboard;
    });
  }
  private readonly destroy$ = new Subject<void>();
  clipboardValues: number[] = [];
  @Input() selectedCount: number = 0;
  @Output() action = new EventEmitter<string>();
  buttons: ToolbarButton[] = [
    {
      label: 'New Folder',
      icon: 'create_new_folder',
      isDisabled: () => false,
      event: 'new',
    },
    {
      label: 'Upload File',
      icon: 'upload',
      isDisabled: () => false,
      event: 'upload',
    },
    {
      label: 'Sort',
      icon: 'sort',
      isDisabled: () => false,
      menu: 'sort-menu',
    },
    {
      label: 'Download',
      icon: 'download',
      isDisabled: () => this.selectedCount === 0,
      event: 'download',
    },
    {
      label: 'Delete',
      icon: 'delete_forever',
      isDisabled: () => this.selectedCount === 0,
      event: 'delete',
    },
    {
      label: 'Rename',
      icon: 'drive_file_rename_outline',
      isDisabled: () => this.selectedCount != 1,
      event: 'rename',
    },
    {
      label: 'Cut',
      icon: 'content_cut',
      isDisabled: () => this.selectedCount === 0,
      event: 'cut',
    },
    {
      label: 'Paste',
      icon: 'content_paste',
      isDisabled: () => this.isClipboardEmpty,
      badgeValue: () => this.clipboardCount,
      event: 'paste',
    },
    {
      label: 'Disk Info',
      icon: 'hard_disk',
      class: 'material-symbols-outlined',
      isDisabled: () => false,
      event: 'disk-info',
    },
  ];

  emitEvent(val: string | undefined) {
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
  label: string;
  icon: string;
  class?: string;
  isDisabled: () => boolean;
  event?: string;
  menu?: string;
  badgeValue?: () => number | undefined;
}
