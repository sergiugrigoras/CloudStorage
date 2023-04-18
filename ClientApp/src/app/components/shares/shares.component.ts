import { Component, OnInit, TemplateRef, ViewChild, Inject, AfterViewInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ShareModel } from 'src/app/interfaces/share.interface';
import { DriveService } from 'src/app/services/drive.service';
import { MatDialog, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatCalendar, MatDatepicker } from '@angular/material/datepicker';
import { DateAdapter, MatDateFormats, MAT_DATE_FORMATS } from '@angular/material/core';
import { Subject, takeUntil } from 'rxjs';

export interface DialogData {
  animal: string;
  name: string;
}

@Component({
  selector: 'shares',
  templateUrl: './shares.component.html',
  styleUrls: ['./shares.component.scss']
})
export class SharesComponent implements OnInit, AfterViewInit {
  shares: ShareModel[] = [];
  animal: string;
  name: string
  exampleHeader = ExampleHeader;
  @ViewChild('dialog') templateDialog: TemplateRef<any>;
  @ViewChild('picker') datePicker: MatDatepicker<Date>;
  constructor(private driveService: DriveService, public dialog: MatDialog) { }

  ngAfterViewInit(): void {
    console.log(this.datePicker);
    this.datePicker.viewChanged.subscribe(console.log);
  }

  ngOnInit(): void {
    this.driveService.getAllUsersShares().subscribe(res => {
      this.shares = res;
    });
  }


  logDate() {
    console.log(this.datePicker);


  }

  openDialog(): void {
    const dialogRef = this.dialog.open(this.templateDialog, {
      hasBackdrop: true,
      disableClose: false
    });
  }

  deleteBtnClick(index: number) {
    document.getElementById(`delete-btn-${index}`)!.hidden = true;
    document.getElementById(`copy-btn-${index}`)!.hidden = true;
    document.getElementById(`cancel-btn-${index}`)!.hidden = false;
    document.getElementById(`confirm-btn-${index}`)!.hidden = false;
  }

  cancelBtnClick(index: number) {
    document.getElementById(`delete-btn-${index}`)!.hidden = false;
    document.getElementById(`copy-btn-${index}`)!.hidden = false;
    document.getElementById(`cancel-btn-${index}`)!.hidden = true;
    document.getElementById(`confirm-btn-${index}`)!.hidden = true;
  }

  confirmBtnClick(index: number) {
    let publicId = this.shares[index].publicId;
    this.shares.splice(index, 1);
    this.driveService.deleteShare(publicId!).subscribe();
  }

  copyBtnClick(index: number) {
    console.log(this.driveService.getShareUrl(this.shares[index].publicId!));
    const input = document.createElement('input');
    input.type = 'text';
    input.style.position = 'fixed';
    input.style.left = '0';
    input.style.top = '0';
    input.style.opacity = '0';
    input.value = this.driveService.getShareUrl(this.shares[index].publicId!);
    document.body.appendChild(input);
    input.focus();
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
  }
}


@Component({
  selector: 'example-header',
  styles: [
    `
    .example-header {
      display: flex;
      align-items: center;
      padding: 0.5em;
    }

    .example-header-label {
      flex: 1;
      height: 1em;
      font-weight: 500;
      text-align: center;
    }
  `,
  ],
  template: `
    <div class="example-header">
      <button mat-icon-button (click)="previousClicked('year')">
        <span class="material-icons">
          keyboard_double_arrow_left
        </span>  
      </button>
      <button mat-icon-button (click)="previousClicked('month')">
        <span class="material-icons">keyboard_arrow_left</span>
      </button>
      <span class="example-header-label">{{periodLabel}}</span>
      <button mat-icon-button (click)="nextClicked('month')">
        <span class="material-icons">keyboard_arrow_right</span>
      </button>
      <button mat-icon-button (click)="nextClicked('year')">
        <span class="material-icons">keyboard_double_arrow_right</span>
      </button>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExampleHeader<D> implements OnDestroy {
  private _destroyed = new Subject<void>();

  constructor(
    private _calendar: MatCalendar<D>,
    private _dateAdapter: DateAdapter<D>,
    @Inject(MAT_DATE_FORMATS) private _dateFormats: MatDateFormats,
    cdr: ChangeDetectorRef,
  ) {
    _calendar.stateChanges.pipe(takeUntil(this._destroyed)).subscribe(() => cdr.markForCheck());
  }

  ngOnDestroy() {
    this._destroyed.next();
    this._destroyed.complete();
  }

  get periodLabel() {
    return this._dateAdapter
      .format(this._calendar.activeDate, this._dateFormats.display.monthYearLabel)
      .toLocaleUpperCase();
  }

  previousClicked(mode: 'month' | 'year') {
    this._calendar.activeDate =
      mode === 'month'
        ? this._dateAdapter.addCalendarMonths(this._calendar.activeDate, -1)
        : this._dateAdapter.addCalendarYears(this._calendar.activeDate, -1);
  }

  nextClicked(mode: 'month' | 'year') {
    console.log(this._calendar);
    mode === 'month' ? this._calendar.currentView = 'year' : this._calendar.currentView = 'month'

    /* this._calendar.activeDate =
      mode === 'month'
        ? this._dateAdapter.addCalendarMonths(this._calendar.activeDate, 1)
        : this._dateAdapter.addCalendarYears(this._calendar.activeDate, 1); */
  }
}