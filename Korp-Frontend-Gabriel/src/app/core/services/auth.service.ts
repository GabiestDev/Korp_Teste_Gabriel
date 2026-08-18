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

  readonly autenticado = computed(() => this.token() !== null);

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
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return { nome: payload.sub ?? 'Usuario', username: payload.sub ?? '' };
    } catch {
      return null;
    }
  }

  obterToken(): string | null {
    return this.token();
  }

  private lerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}