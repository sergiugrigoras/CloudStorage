import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { MatMenu, MatMenuTrigger, MatMenuItem } from '@angular/material/menu';
import { DriveService } from '../../../services/drive.service';
import { Subject } from 'rxjs';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatBadge } from '@angular/material/badge';

@Component({
  selector: 'toolbar',
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  imports: [MatIconButton, MatTooltip, MatMenuTrigger, MatBadge, MatMenu, MatMenuItem],
})
export class ToolbarComponent {
  private readonly driveService = inject(DriveService);
  private clipboard = this.driveService.clipboard;
  private clipboardCount = computed(() => this.clipboard().length);
  constructor() {}

  private readonly destroy$ = new Subject<void>();
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
      isDisabled: () => this.clipboardCount() === 0,
      badgeValue: () => (this.clipboardCount() === 0 ? undefined : this.clipboardCount()),
      event: 'paste',
    },
    {
      label: 'Storage Info',
      icon: 'hard_drive',
      class: 'material-symbols-outlined',
      isDisabled: () => false,
      event: 'disk-info',
    },
  ];

  emitEvent(val: string | undefined) {
    if (val) this.action.emit(val);
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
