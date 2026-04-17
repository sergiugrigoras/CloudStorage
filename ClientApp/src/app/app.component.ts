import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from 'ng2-charts';
import { ChartOptions } from 'chart.js';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatButton, MatIconButton, MatMiniFabButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { NgTemplateOutlet } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatDivider } from '@angular/material/divider';
import { filter, map, Subject, takeUntil } from 'rxjs';
import { tap } from 'rxjs/operators';

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
type AppPalette = {
  name: string;
  cssClass: string;
  lightColor: string;
  darkColor: string;
};
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
    MatTooltip,
    MatMenuTrigger,
    MatMiniFabButton,
    MatMenuItem,
    MatTooltip,
    MatIconButton,
    NgTemplateOutlet,
    MatIcon,
    MatDivider,
  ],
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly elem = inject(ElementRef);
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  readonly title = 'scs';
  private readonly _darkModeIcon = 'dark_mode';
  private readonly _lightModeIcon = 'light_mode';
  private readonly _darkTheme = 'dark_theme';
  private readonly _lightTheme = 'light_theme';
  private readonly _darkClassName = 'dark-mode';
  private readonly _themeKey = 'theme';
  private readonly _paletteKey = 'palette';

  readonly isLoggedIn = this.authService.isUserLoggedIn;
  readonly isLargeDevice = signal(false);
  private readonly theme = signal('');
  readonly themeIcon = computed(() =>
    this.theme() === this._darkTheme ? this._lightModeIcon : this._darkModeIcon
  );
  scrHeight = 0;
  scrWidth = 0;
  @ViewChild('intersectionElement', { static: true })
  intersectionDiv: ElementRef<HTMLDivElement> | null = null;
  readonly year = new Date().getFullYear();

  readonly palettes: AppPalette[] = [
    { name: 'Azure', cssClass: '', lightColor: '#005cbb', darkColor: '#abc7ff' },
    { name: 'Green', cssClass: 'green-theme', lightColor: '#026e00', darkColor: '#02e600' },
    { name: 'Violet', cssClass: 'violet-theme', lightColor: '#7d00fa', darkColor: '#d5baff' },
    { name: 'Orange', cssClass: 'orange-theme', lightColor: '#964900', darkColor: '#ffb787' },
    { name: 'Blue', cssClass: 'blue-theme', lightColor: '#343dff', darkColor: '#bec2ff' },
    { name: 'Yellow', cssClass: 'yellow-theme', lightColor: '#626200', darkColor: '#cdcd00' },
    { name: 'Cyan', cssClass: 'cyan-theme', lightColor: '#006a6a', darkColor: '#00dddd' },
    { name: 'Magenta', cssClass: 'magenta-theme', lightColor: '#a900a9', darkColor: '#ffabf3' },
    { name: 'Rose', cssClass: 'rose-theme', lightColor: '#ba005c', darkColor: '#ffb1c5' },
  ];
  protected readonly appRoutes = this.authService.appRoutes;
  private currentRoute: string | null = null;
  private readonly destroy$ = new Subject<void>();

  constructor() {}
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  ngAfterViewInit(): void {
    const backTopButton = this.elem.nativeElement.querySelector('.back-top') as HTMLElement;
    const intersectionCallback = () => {
      /*      const routes = ['/', '/media', '/drive', '/notes'];
      if (this.currentRoute && routes.includes(this.currentRoute))*/
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
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter((event) => event instanceof NavigationEnd),
        map((event: NavigationEnd) => event.urlAfterRedirects),
        tap((url) => {
          this.currentRoute = url;
        })
      )
      .subscribe();
    this.isLoggedIn.set(this.authService.jwtTokenExists());
    const userSelectedTheme = localStorage.getItem(this._themeKey);
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    const theme = userSelectedTheme ?? (prefersDark ? this._darkTheme : this._lightTheme);
    this.setTheme(theme, false);

    const userSelectedPalette = localStorage.getItem(this._paletteKey);
    if (userSelectedPalette) {
      this.changePalette(userSelectedPalette);
    }
    this.getScreenSize();
  }

  logout() {
    this.authService.logout().subscribe();
  }

  getUser() {
    return this.authService.getUserNameFromJwtToken();
  }

  @HostListener('window:resize')
  protected getScreenSize() {
    this.scrHeight = window.innerHeight;
    this.scrWidth = window.innerWidth;
    this.isLargeDevice.set(this.scrWidth >= 768);
  }

  toggleTheme() {
    const newTheme = this.theme() === this._darkTheme ? this._lightTheme : this._darkTheme;
    this.setTheme(newTheme, true);
  }

  private setTheme(theme: string, save: boolean) {
    switch (theme) {
      case this._lightTheme:
        document.body.classList.remove(this._darkClassName);
        //this.overlay.getContainerElement().classList.remove(this._darkClassName);
        this.themeService.setColorschemesOptions(WHITE_THEME_CHART_OPTIONS);
        break;
      case this._darkTheme:
        document.body.classList.add(this._darkClassName);
        //this.overlay.getContainerElement().classList.add(this._darkClassName);
        this.themeService.setColorschemesOptions(DARK_THEME_CHART_OVER);
        break;
      default:
        break;
    }
    this.theme.set(theme);
    if (save) {
      localStorage.setItem(this._themeKey, theme);
    }
  }

  changePalette(name: string) {
    const palette = this.palettes.find((x) => x.name === name);
    if (palette === undefined) return;
    const classesToRemove = this.palettes.map((x) => x.cssClass).filter((x) => !!x);
    document.body.classList.remove(...classesToRemove);
    if (palette.cssClass) {
      document.body.classList.add(palette.cssClass);
    }
    localStorage.setItem(this._paletteKey, name);
  }
}
