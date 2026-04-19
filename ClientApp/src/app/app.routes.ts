import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { registerGuard } from './guards/register.guard';
import { LoginComponent } from './components/auth/login/login.component';
import { ResetPasswordComponent } from './components/auth/reset-password/reset-password.component';
import { ProfileComponent } from './components/auth/profile/profile.component';
import { authGuard } from './guards/auth.guard';
import { DriveComponent } from './components/drive/drive/drive.component';
import { MediaComponent } from './components/media/media/media.component';
import { NotesComponent } from './components/notes/notes.component';
import { ExpenseComponent } from './components/expense/expense/expense.component';
import { AdminComponent } from './components/admin/admin.component';
import { adminGuard } from './guards/admin.guard';
import { SecurityComponent } from './components/auth/security/security.component';
import { ForgotPasswordComponent } from './components/auth/forgot-password/forgot-password.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'register', component: RegisterComponent, canActivate: [registerGuard] },
  { path: 'login', component: LoginComponent, canActivate: [registerGuard] },
  { path: 'password/reset', component: ResetPasswordComponent, canActivate: [registerGuard] },
  { path: 'password/forgot', component: ForgotPasswordComponent, canActivate: [registerGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'security', component: SecurityComponent, canActivate: [authGuard] },
  { path: 'drive', component: DriveComponent, canActivate: [authGuard] },
  { path: 'media', component: MediaComponent, canActivate: [authGuard] },
  { path: 'media/:page', component: MediaComponent, canActivate: [authGuard] },
  { path: 'media/:page/:id', component: MediaComponent, canActivate: [authGuard] },
  { path: 'notes', component: NotesComponent, canActivate: [authGuard] },
  { path: 'expenses', component: ExpenseComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
];
