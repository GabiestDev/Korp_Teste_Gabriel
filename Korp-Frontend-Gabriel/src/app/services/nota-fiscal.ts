import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CriarNotaPayload, NotaFiscal } from '../models/nota-fiscal.model';

@Injectable({
  providedIn: 'root',
})
export class NotaFiscalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlFaturamento;

  listarNotas(): Observable<NotaFiscal[]> {
    return this.http.get<NotaFiscal[]>(this.baseUrl);
  }

  criarNota(nota: CriarNotaPayload): Observable<NotaFiscal> {
    return this.http.post<NotaFiscal>(this.baseUrl, nota);
  }

  imprimirNota(id: number): Observable<NotaFiscal> {
    return this.http.post<NotaFiscal>(`${this.baseUrl}/${id}/imprimir`, {});
  }
}