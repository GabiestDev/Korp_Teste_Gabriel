import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly contador = signal(0);
  readonly carregando = signal(false);

  iniciar(): void {
    this.contador.update((n) => n + 1);
    this.carregando.set(this.contador() > 0);
  }

  finalizar(): void {
    this.contador.update((n) => Math.max(0, n - 1));
    this.carregando.set(this.contador() > 0);
  }
}