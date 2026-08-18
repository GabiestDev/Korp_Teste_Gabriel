import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  senha = '';
  mensagemErro = '';

  entrar(): void {
    if (!this.email.trim() || !this.senha.trim()) {
      this.mensagemErro = 'Informe e-mail e senha para entrar.';
      return;
    }
    this.authService.login(this.email.trim(), this.senha);
    this.router.navigate(['/notas-fiscais']);
  }
}