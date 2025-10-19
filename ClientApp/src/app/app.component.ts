import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  HostListener,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { AuthService } from './services/auth.service';
import { OverlayContainer } from '@angular/cdk/overlay';
import { AppRoute } from './interfaces/app-route.interface';
import { ThemeService } from 'ng2-charts';
import { ChartOptions } from 'chart.js';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatButton, MatMiniFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';

const DARK_THEME_CHART_OVER: ChartOptions = {
  plugins: {
    legend: {
      labels: {
        color: 'white',
      },
    },
  },
  scales: {
    x: {
      ticks: { color: 'white' },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
    y: {
      ticks: { color: 'white' },
      grid: { color: 'rgba(255,255,255,0.1)' },
    },
  },
};
const WHITE_THEME_CHART_OPTIONS: ChartOptions = {};
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    RouterOutlet,
    MatToolbar,
    MatMenu,
    MatToolbarRow,
    RouterLink,
    MatButton,
    RouterLinkActive,
    MatTooltip,
    MatMenuTrigger,
    MatMiniFabButton,
    MatMenuItem,
    MatTooltip,
  ],
})
export class AppComponent implements OnInit, AfterViewInit {
  private readonly authService = inject(AuthService);
  private readonly overlay = inject(OverlayContainer);
  private readonly elem = inject(ElementRef);
  private readonly themeService = inject(ThemeService);
  title = 'scs';
  readonly isLoggedIn = this.authService.isUserLoggedIn;
  readonly isLargeDevice = signal(false);
  readonly themeIcon = signal('');
  scrHeight = 0;
  scrWidth = 0;
  readonly darkClassName = 'darkMode';
  @HostBinding('class') hostClassName = '';
  @ViewChild('intersectionElement', { static: true })
  intersectionDiv: ElementRef<HTMLDivElement> | null = null;
  year = new Date().getFullYear();
  routes: AppRoute[] = [
    { route: '/drive', displayName: 'Drive' },
    { route: '/media', displayName: 'Media' },
    { route: '/notes', displayName: 'Notes' },
    { route: '/expenses', displayName: 'Expenses' },
  ];
  constructor() {}
  ngAfterViewInit(): void {
    const backTopButton = this.elem.nativeElement.querySelector('.back-top') as HTMLElement;
    const intersectionCallback = () => {
      backTopButton.classList.toggle('invisible');
    };
    const intersectionObserver = new IntersectionObserver(intersectionCallback, {
      rootMargin: '0px',
      threshold: 1,
      root: null,
    });
    if (this.intersectionDiv) {
      intersectionObserver.observe(this.intersectionDiv.nativeElement);
    }
  }

  scrollTop() {
    window.scroll({
      top: 0,
      left: 0,
      behavior: 'smooth',
    });
  }

  ngOnInit(): void {
    this.isLoggedIn.set(this.authService.jwtTokenExists());

    const userSelectedTheme = localStorage.getItem('theme');
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const theme = userSelectedTheme ?? (prefersDark ? 'dark' : 'light');
    this.setTheme(theme, false);

    this.getScreenSize();
  }

  logout() {
    this.authService.logout().subscribe();
  }

  getUser() {
    return this.authService.getUserNameFromJwtToken();
  }

  @HostListener('window:resize', ['$event'])
  private getScreenSize() {
    this.scrHeight = window.innerHeight;
    this.scrWidth = window.innerWidth;
    this.isLargeDevice.set(this.scrWidth >= 768);
  }

  toggleTheme() {
    if (this.hostClassName === this.darkClassName) {
      this.setTheme('light', true);
    } else {
      this.setTheme('dark', true);
    }
  }

  private setTheme(theme: string, save: boolean) {
    this.themeIcon.set(theme === 'light' ? 'dark_mode' : 'light_mode');
    if (theme === 'light') {
      this.hostClassName = '';
      this.overlay.getContainerElement().classList.remove(this.darkClassName);
      this.themeService.setColorschemesOptions(WHITE_THEME_CHART_OPTIONS);
    } else if (theme === 'dark') {
      this.hostClassName = this.darkClassName;
      this.overlay.getContainerElement().classList.add(this.darkClassName);
      this.themeService.setColorschemesOptions(DARK_THEME_CHART_OVER);
    }
    if (save) {
      localStorage.setItem('theme', theme);
    }
  }
}
