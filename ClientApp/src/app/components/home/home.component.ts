import { AuthService } from 'src/app/services/auth.service';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [MatCard, RouterLink, MatCardContent, MatButton],
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  readonly isLoggedIn = this.authService.isUserLoggedIn;
  private readonly destroy$ = new Subject<void>();
  constructor() {}

  readonly cards: HomeCard[] = [
    { label: 'Drive', icon: 'backup', link: '/drive' },
    { label: 'Media', icon: 'image', link: '/media' },
    { label: 'Notes', icon: 'edit_note', link: '/notes' },
    { label: 'Expenses', icon: 'paid', link: '/expenses' },
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
}

export interface HomeCard {
  icon: string;
  label: string;
  link: string;
}
