import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { environment } from 'src/environments/environment';
import { AuthService } from './auth.service';

const apiUrl: string = environment.apiUrl;

@Injectable()
export class AuthGuard implements CanActivate {
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
