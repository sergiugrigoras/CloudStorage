import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter, HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import { MediaObject } from 'src/app/model/media-object.model';
import {MediaService} from "../../services/media.service";
import {catchError, EMPTY, retry, Subject, takeUntil, tap} from "rxjs";
import {DomSanitizer} from "@angular/platform-browser";

@Component({
  selector: 'app-media-item',
  templateUrl: './media-item.component.html',
  styleUrls: ['./media-item.component.scss']
})
export class MediaItemComponent implements OnInit, OnDestroy, AfterViewInit{
  @Input() item: MediaObject;
  @Input() xObserver: IntersectionObserver;
  url: string;
  @Output() open = new EventEmitter<string>();
  private readonly destroy$ = new Subject<void>();
  selectMode: boolean;
  constructor(
    private mediaService: MediaService,
    private sanitizer: DomSanitizer,
    private el: ElementRef) {
  }

  itemTouched() {
    if (this.selectMode) {
      this.item.isSelected = !this.item.isSelected;
    } else {
      this.open.emit(this.item.id);
    }
  }
  openItem() {
    this.open.emit(this.item.id);
  }

  @HostListener('contextmenu', ['$event'])
  onRightClick($event: Event) {
    $event.preventDefault();
    this.item.isSelected = !this.item.isSelected;
    this.mediaService.enableSelectMode();
  }

  ngOnInit(): void {
    this.mediaService.selectMode$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(selectMode => {
      this.selectMode = selectMode;
    });
    this.mediaService.getSnapshotFile(this.item.id)
      .pipe(
        takeUntil(this.destroy$),
        retry(3),
        catchError((error: any) => {
          return EMPTY;
        }),
        tap(response => {
          this.url = URL.createObjectURL(response.body);
          const safeUrl = this.sanitizer.bypassSecurityTrustUrl(this.url);
          this.item.snapshot$.next(safeUrl);
          this.item.snapshot$.complete();
          this.item.isLoading = false;
        }))
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
