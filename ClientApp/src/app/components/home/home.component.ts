import { AuthService } from 'src/app/services/auth.service';
import { Component, inject } from '@angular/core';
import { MatCard, MatCardContent } from '@angular/material/card';
import { RouterLink } from '@angular/router';
import { MatButton } from '@angular/material/button';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [MatCard, RouterLink, MatCardContent, MatButton],
})
export class HomeComponent {
  private readonly authService = inject(AuthService);
  protected readonly isLoggedIn = this.authService.isUserLoggedIn;
  protected readonly appRoutes = this.authService.appRoutes;
  constructor() {}
}
