import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MediaObject } from 'src/app/model/media-object.model';

@Component({
  selector: 'app-media-item',
  templateUrl: './media-item.component.html',
  styleUrls: ['./media-item.component.scss']
})
export class MediaItemComponent {
  @Input() item: MediaObject;
  @Output() open = new EventEmitter<string>();

  openItem() {
    this.open.emit(this.item.id);
  }

  toVideoTime(duration: number) {
    var minutes = Math.floor(duration / 60000);
    var seconds = Math.floor((duration % 60000) / 1000);
    return (
      seconds == 60 ?
        (minutes + 1) + ":00" :
        minutes + ":" + (seconds < 10 ? "0" : "") + seconds
    );
  }
}
