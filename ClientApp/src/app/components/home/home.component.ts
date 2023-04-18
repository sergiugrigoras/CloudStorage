import { AuthService } from 'src/app/services/auth.service';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  isLoggedInSubscription: Subscription = new Subscription();

  constructor(private authService: AuthService) { }
  ngOnDestroy(): void {
    this.isLoggedInSubscription.unsubscribe();
  }

  ngOnInit(): void {
    this.isLoggedInSubscription = this.authService.isUserLoggedInSubject.subscribe(val => {
      this.isLoggedIn = val;
    }
    );
  }
}
