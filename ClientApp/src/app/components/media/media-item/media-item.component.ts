import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { MediaObject } from '../../../model/media-object.model';
import { MediaService } from '../../../services/media.service';
import { catchError, EMPTY, retry, Subject, tap } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-media-item',
  templateUrl: './media-item.component.html',
  styleUrls: ['./media-item.component.scss'],
  imports: [MatProgressBar, MatIconButton],
})
export class MediaItemComponent implements OnInit, OnDestroy {
  private mediaService = inject(MediaService);
  private sanitizer = inject(DomSanitizer);
  private el = inject(ElementRef);
  @Input() item: MediaObject | null = null;
  @Input() xObserver: IntersectionObserver | null = null;
  url: string | null = null;
  @Output() open = new EventEmitter<string>();
  private readonly destroy$ = new Subject<void>();
  protected readonly selectMode = this.mediaService.selectMode;
  constructor() {}

  itemTouched() {
    if (this.item == null) return;
    if (this.selectMode()) {
      this.item.toggleSelected();
    } else {
      this.open.emit(this.item.id);
    }
  }
  openItem() {
    if (this.item == null) return;
    this.open.emit(this.item.id);
  }

  @HostListener('contextmenu', ['$event'])
  onRightClick($event: Event) {
    if (this.item == null) return;
    $event.preventDefault();
    this.item.toggleSelected();
    this.mediaService.selectMode.set(true);
  }

  ngOnInit(): void {
    if (this.item == null || this.item.snapshot()) return;
    this.mediaService
      .getSnapshotFile(this.item.id)
      .pipe(
        retry(3),
        catchError(() => {
          return EMPTY;
        }),
        tap((response) => {
          if (response?.body && this.item) {
            const url = URL.createObjectURL(response.body);
            this.item.snapshot.set(this.sanitizer.bypassSecurityTrustUrl(url));
            this.item.snapshotObjectUrl = url;
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
