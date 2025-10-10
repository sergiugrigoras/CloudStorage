import { AuthService } from 'src/app/services/auth.service';
import {Component, OnDestroy, OnInit, signal} from '@angular/core';
import {Subject, Subscription, takeUntil} from 'rxjs';
import {AppComponent} from "../../app.component";
@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  readonly isLoggedIn = this.authService.isUserLoggedIn;
  private readonly destroy$ = new Subject<void>();
  constructor(private authService: AuthService) { }
  readonly cards: HomeCard[] = [
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
    if (this.authService.isAdmin()) {
      this.cards.push(this._adminCard);
    }
  }

  // home.component.ts
/*  readonly isLoggedIn = this.authService.isUserLoggedIn;
  readonly cards = computed(() => {
    const baseCards = [...this._defaultCards];
    if (this.authService.isAdmin()) baseCards.push(this._adminCard);
    return baseCards;
  });*/
}

export interface HomeCard {
  icon: string,
  label: string,
  link: string
}
