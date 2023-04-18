import { HomeComponent } from './components/home/home.component';
import { AfterViewInit, Component, ElementRef, HostBinding, HostListener, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { OverlayContainer } from '@angular/cdk/overlay';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit {

  title = 'scs';
  isLoggedIn: boolean = false;
  scrHeight: any;
  scrWidth: any;
  readonly darkClassName = 'darkMode';
  @HostBinding('class') hostClassName = '';
  @ViewChild('emptyDiv', { static: true }) emptyDiv: ElementRef<HTMLDivElement>;
  year = new Date().getFullYear();

  constructor(private authService: AuthService, private router: Router, private overlay: OverlayContainer, private elem: ElementRef) { }
  ngAfterViewInit(): void {
    const backTopButton = this.elem.nativeElement.querySelector('.back-top') as HTMLElement;
    const intersectionCallback = (entries: IntersectionObserverEntry[]) => {
      backTopButton.classList.toggle('invisible');
    };
    const intersectionObserver = new IntersectionObserver(
      intersectionCallback,
      { rootMargin: '0px', threshold: 1, root: null });
    intersectionObserver.observe(this.emptyDiv?.nativeElement);
  }

  scrollTop() {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  ngOnInit(): void {
    const userSelectedTheme = localStorage.getItem('theme');
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches && !userSelectedTheme) {
      this.setTheme('dark', false);
    } else {
      this.setTheme(userSelectedTheme, false);
    }
    this.isLoggedIn = this.authService.isLoggedIn();
    this.getScreenSize();
  }

  checkLoggedIn() {
    this.isLoggedIn = this.authService.isLoggedIn();
  }

  logout() {
    this.authService.logout().pipe(tap(() => {
      this.router.navigate(['/']);
      this.checkLoggedIn();
    })).subscribe();
  }

  getUser() {
    return this.authService.getUser();
  }

  onOutletLoaded(event: any) {
    if (event instanceof HomeComponent)
      event.isLoggedIn = this.authService.isLoggedIn();
  }

  @HostListener('window:resize', ['$event'])
  private getScreenSize() {
    this.scrHeight = window.innerHeight;
    this.scrWidth = window.innerWidth;
  }

  isLargeDevice() {
    return this.scrWidth >= 768;
  }

  toggleTheme() {
    if (this.hostClassName === this.darkClassName) {
      this.setTheme('light', true);
    }
    else {
      this.setTheme('dark', true);
    }
  }

  private setTheme(theme: string, save: boolean) {
    if (theme === 'light') {
      this.hostClassName = '';
      this.overlay.getContainerElement().classList.remove(this.darkClassName);

    } else if (theme === 'dark') {
      this.hostClassName = this.darkClassName;
      this.overlay.getContainerElement().classList.add(this.darkClassName);
    }
    if (save) {
      localStorage.setItem('theme', theme);
    }
  }
}


