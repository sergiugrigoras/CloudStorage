import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import { MediaObject } from 'src/app/model/media-object.model';
import {MediaService} from "../../services/media.service";
import {fromEvent, Subject, takeUntil, throttleTime} from "rxjs";

@Component({
  selector: 'app-media-item',
  templateUrl: './media-item.component.html',
  styleUrls: ['./media-item.component.scss']
})
export class MediaItemComponent implements AfterViewInit, OnInit, OnDestroy{
  @Input() item: MediaObject;
  @Output() open = new EventEmitter<string>();
  @Output() fetchSnapshot = new EventEmitter<MediaObject>();
  private readonly destroy$ = new Subject<void>();
  constructor(private element: ElementRef, private mediaService: MediaService) {
  }
  ngAfterViewInit(): void {
    this.loadIfVisible();
  }

  openItem() {
    this.open.emit(this.item.id);
  }

  getVideoDuration(duration: number) {
    return MediaService.toVideoTime(duration);
  }

  private loadIfVisible() {
    if (this.visibleInViewport() && this.item.isLoading) {
      this.fetchSnapshot.emit(this.item);
    }
  }

  private visibleInViewport() {
    const rect = this.element?.nativeElement.getBoundingClientRect();
    return rect && rect.top <= window.innerHeight * 2;
  }

  ngOnInit(): void {
    fromEvent(document, 'scroll')
      .pipe(
        takeUntil(this.destroy$),
        throttleTime(150)
      )
      .subscribe(() => {
        this.loadIfVisible();
      });

    this.mediaService.updateSnapshot$
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe(() => {
      this.loadIfVisible();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
