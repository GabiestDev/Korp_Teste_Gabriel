import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { AuthService } from '../../core/services/auth.service';
import { MensagemService } from '../../shared/mensagem.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly mensagemService = inject(MensagemService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    senha: ['', Validators.required],
  });

  mensagemErro = '';
  logando = false;

  get f() {
    return this.form.controls;
  }

  entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.mensagemErro = 'Informe usuário e senha para entrar.';
      return;
    }

    this.logando = true;
    this.mensagemErro = '';

    const { username, senha } = this.form.getRawValue();

    this.authService.login(username.trim(), senha).subscribe({
      next: () => {
        this.logando = false;
        this.router.navigate(['/notas-fiscais']);
      },
      error: (err: { status?: number; message?: string }) => {
        this.logando = false;
        const status = err.status ?? 0;
        const msg = err.message || 'Não foi possível entrar. Verifique usuário e senha.';
        this.mensagemErro = status === 401 ? 'Usuário ou senha inválidos.' : msg;
        this.mensagemService.mostrarErro(this.mensagemErro, status);
      },
    });
  }
}