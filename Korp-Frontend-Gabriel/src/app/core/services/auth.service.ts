import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/nota-fiscal.model';

const TOKEN_KEY = 'korp_token';

export interface Usuario {
  nome: string;
  username: string;
}

export interface LoginResponse {
  token: string;
  username: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly token = signal<string | null>(this.lerToken());

  readonly autenticado = computed(() => this.tokenValido(this.token()));

  login(username: string, senha: string): Observable<Usuario> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${environment.apiUrlAuth}/login`, {
        username,
        senha,
      })
      .pipe(
        map((r) => r.data),
        tap((data) => {
          localStorage.setItem(TOKEN_KEY, data.token);
          this.token.set(data.token);
        }),
        map((data) => ({ nome: data.username, username: data.username })),
      );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.token.set(null);
  }

  usuario(): Usuario | null {
    const token = this.token();
    if (!this.tokenValido(token)) return null;
    const payload = decodificarPayload(token);
    if (!payload) return null;
    const nome = (payload['sub'] as string | undefined) ?? (payload['name'] as string | undefined) ?? 'Usuario';
    return { nome, username: nome };
  }

  obterToken(): string | null {
    const token = this.token();
    return this.tokenValido(token) ? token : null;
  }

  private lerToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && !this.tokenValido(token)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  }

  private tokenValido(token: string | null): token is string {
    if (!token) return false;
    const payload = decodificarPayload(token);
    if (!payload) return false;
    const exp = payload['exp'];
    if (typeof exp !== 'number') return true;
    return exp * 1000 > Date.now();
  }
}

function decodificarPayload(token: string): Record<string, unknown> | null {
  try {
    const parte = token.split('.')[1];
    if (!parte) return null;
    const base64 = parte.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(pad)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}