import { Injectable, computed, signal } from '@angular/core';

const TOKEN_KEY = 'korp_token';

export interface Usuario {
  nome: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly token = signal<string | null>(this.lerToken());

  readonly autenticado = computed(() => this.token() !== null);

  login(email: string, senha: string): void {
    const nome = email.split('@')[0] || 'Usuario';
    const payload: Usuario = { nome, email };
    const token = btoa(JSON.stringify(payload));
    localStorage.setItem(TOKEN_KEY, token);
    this.token.set(token);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  usuario(): Usuario | null {
    const token = this.token();
    if (!token) return null;
    try {
      return JSON.parse(atob(token)) as Usuario;
    } catch {
      return null;
    }
  }

  private lerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}