import { ProfileComponent } from './components/profile/profile.component';
import { NotesComponent } from './components/notes/notes.component';
import { RegGuard } from './services/reg-guard.service';
import { DriveComponent } from './components/drive/drive.component';
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { AuthGuard } from './services/auth-guard.service';
import { HomeComponent } from './components/home/home.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { MediaComponent } from './components/media/media.component';
import {ExpenseComponent} from "./components/expense/expense.component";

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'register', component: RegisterComponent, canActivate: [RegGuard] },
  { path: 'login', component: LoginComponent, canActivate: [RegGuard] },
  { path: 'password/reset', component: ResetPasswordComponent, canActivate: [RegGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [AuthGuard] },
  { path: 'drive', component: DriveComponent, canActivate: [AuthGuard] },
  { path: 'media', component: MediaComponent, canActivate: [AuthGuard] },
  { path: 'media/:page', component: MediaComponent, canActivate: [AuthGuard] },
  { path: 'media/:page/:id', component: MediaComponent, canActivate: [AuthGuard] },
  { path: 'notes', component: NotesComponent, canActivate: [AuthGuard] },
  { path: 'expenses', component: ExpenseComponent, canActivate: [AuthGuard] },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
