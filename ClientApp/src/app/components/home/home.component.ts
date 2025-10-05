import { AuthService } from 'src/app/services/auth.service';
import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {Subject, Subscription, takeUntil} from 'rxjs';
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  isLoggedIn = signal(false);
  private readonly destroy$ = new Subject<void>();
  constructor(private authService: AuthService) { }
  cards: HomeCard[] = [
    { label: 'Drive', icon: 'backup', link: '/drive' },
    { label: 'Media', icon: 'image', link: '/media' },
    { label: 'Notes', icon: 'edit_note', link: '/notes' },
    { label: 'Expenses', icon: 'paid', link: '/expenses' }
  ];
  private _adminCard: HomeCard = { label: 'Admin', icon: 'settings', link: '/admin' };
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.authService.isUserLoggedInSubject.pipe(
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.isLoggedIn.set(val);
    });
    if (this.authService.isAdmin()) {
      this.cards.push(this._adminCard);
    }
  }
}

export interface HomeCard {
  icon: string,
  label: string,
  link: string
}
