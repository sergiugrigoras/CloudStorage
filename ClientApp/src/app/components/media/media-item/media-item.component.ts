import {
  AfterViewInit,
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
import { catchError, EMPTY, retry, Subject, takeUntil, tap } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { NgStyle, AsyncPipe } from '@angular/common';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatIconButton } from '@angular/material/button';

@Component({
  selector: 'app-media-item',
  templateUrl: './media-item.component.html',
  styleUrls: ['./media-item.component.scss'],
  imports: [NgStyle, MatProgressBar, MatIconButton, AsyncPipe],
})
export class MediaItemComponent implements OnInit, OnDestroy, AfterViewInit {
  private mediaService = inject(MediaService);
  private sanitizer = inject(DomSanitizer);
  private el = inject(ElementRef);
  @Input() item: MediaObject | null = null;
  @Input() xObserver: IntersectionObserver | null = null;
  url: string | null = null;
  @Output() open = new EventEmitter<string>();
  private readonly destroy$ = new Subject<void>();
  selectMode = false;
  constructor() {}

  itemTouched() {
    if (this.item == null) return;
    if (this.selectMode) {
      this.item.isSelected = !this.item.isSelected;
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
    this.item.isSelected = !this.item.isSelected;
    this.mediaService.enableSelectMode();
  }

  ngOnInit(): void {
    if (this.item == null) return;
    this.mediaService.selectMode$.pipe(takeUntil(this.destroy$)).subscribe((selectMode) => {
      this.selectMode = selectMode;
    });
    this.mediaService
      .getSnapshotFile(this.item.id)
      .pipe(
        takeUntil(this.destroy$),
        retry(3),
        catchError(() => {
          return EMPTY;
        }),
        tap((response) => {
          if (response?.body && this.item) {
            this.url = URL.createObjectURL(response.body);
            const safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.url);
            this.item.snapshot$.next(safeUrl);
            this.item.snapshot$.complete();
            this.item.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    // URL.revokeObjectURL(this.url);
  }

  ngAfterViewInit(): void {
    const element = this.el?.nativeElement;
    if (element && this.xObserver) {
      this.xObserver.observe(element);
    }
  }
}
