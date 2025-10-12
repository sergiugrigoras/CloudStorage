import { ProfileComponent } from './components/profile/profile.component';
import { NotesComponent } from './components/notes/notes.component';
import { DriveComponent } from './components/drive/drive.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { MediaComponent } from './components/media/media.component';
import { ExpenseComponent } from './components/expense/expense.component';
import { AdminComponent } from './components/admin/admin.component';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { registerGuard } from './guards/register.guard';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'register', component: RegisterComponent, canActivate: [registerGuard] },
  { path: 'login', component: LoginComponent, canActivate: [registerGuard] },
  { path: 'password/reset', component: ResetPasswordComponent, canActivate: [registerGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [authGuard] },
  { path: 'drive', component: DriveComponent, canActivate: [authGuard] },
  { path: 'media', component: MediaComponent, canActivate: [authGuard] },
  { path: 'media/:page', component: MediaComponent, canActivate: [authGuard] },
  { path: 'media/:page/:id', component: MediaComponent, canActivate: [authGuard] },
  { path: 'notes', component: NotesComponent, canActivate: [authGuard] },
  { path: 'expenses', component: ExpenseComponent, canActivate: [authGuard] },
  { path: 'admin', component: AdminComponent, canActivate: [adminGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
