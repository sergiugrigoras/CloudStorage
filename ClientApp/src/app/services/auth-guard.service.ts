import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

const apiUrl: string = environment.baseUrl;

@Injectable()
export class AuthGuard  {
    constructor(private authService: AuthService, private router: Router) {
    }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (this.authService.isLoggedIn()) {
            return true;
        } else {
            this.router.navigate(["login"], { queryParams: { returnUrl: state.url } });
            return this.authService.isLoggedIn();
        }
    }

}
