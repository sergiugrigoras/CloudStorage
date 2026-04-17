import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Component, inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { MatFormField, MatLabel, MatInput } from '@angular/material/input';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput],
})
export class ProfileComponent {
  private readonly authService = inject(AuthService);
  profileForm = new FormGroup({
    name: new FormControl(this.authService.getUserNameFromJwtToken()),
    email: new FormControl(this.authService.getEmailFromJwtToken()),
    roles: new FormControl(this.authService.getRolesFromJwtToken()),
  });

  constructor() {}
}
