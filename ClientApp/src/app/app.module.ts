import { BrowserModule } from '@angular/platform-browser';
import { ErrorHandler, NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { RegisterComponent } from './components/register/register.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { LoginComponent } from './components/login/login.component';
import { AuthInterceptor } from './services/auth.interceptor';
import { DriveComponent } from './components/drive/drive.component';
import { AuthGuard } from './services/auth-guard.service';
import { JwtModule } from '@auth0/angular-jwt';
import { HomeComponent } from './components/home/home.component';
import { FsoComponent } from './components/fso/fso.component';
import { ReadableBytesPipe } from './pipes/readable-bytes.pipe';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { AppErrorHandler } from './model/app-error-handler';
import { PathbarComponent } from './components/pathbar/pathbar.component';
import { DiskinfoComponent } from './components/diskinfo/diskinfo.component';
import { NotesComponent } from './components/notes/notes.component';
import { NoteComponent } from './components/note/note.component';
import { NoteEditorComponent } from './components/note-editor/note-editor.component';
import { FsoAltComponent } from './components/fso-alt/fso-alt.component';
import { UploadProgressComponent } from './components/progress-bar/progress-bar.component';
import { ProfileComponent } from './components/profile/profile.component';
import { ResetPasswordComponent } from './components/reset-password/reset-password.component';
import { ViewNoteComponent } from './components/view-note/view-note.component';
import { SharedFilesComponent } from './components/shared-files/shared-files.component';
import { SharedFsoComponent } from './components/shared-fso/shared-fso.component';
import { SharesComponent } from './components/shares/shares.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule, MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { MediaComponent } from './components/media/media.component';
import { MediaItemComponent } from './components/media-item/media-item.component';
function tokenGetter() {
  return localStorage.getItem("jwt");
}

@NgModule({
  declarations: [
    AppComponent,
    RegisterComponent,
    LoginComponent,
    DriveComponent,
    HomeComponent,
    FsoComponent,
    ReadableBytesPipe,
    ToolbarComponent,
    PathbarComponent,
    DiskinfoComponent,
    NotesComponent,
    NoteComponent,
    NoteEditorComponent,
    FsoAltComponent,
    UploadProgressComponent,
    ProfileComponent,
    ResetPasswordComponent,
    ViewNoteComponent,
    SharedFilesComponent,
    SharedFsoComponent,
    SharesComponent,
    SpinnerComponent,
    MediaComponent,
    MediaItemComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    JwtModule.forRoot({
      config: {
        tokenGetter: tokenGetter
      }
    }),
    BrowserAnimationsModule,
    MatIconModule,
    MatDialogModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatButtonModule,
    MatMenuModule,
    MatInputModule,
    MatSnackBarModule,
    MatCardModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  providers: [
    AuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: ErrorHandler,
      useClass: AppErrorHandler
    },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
