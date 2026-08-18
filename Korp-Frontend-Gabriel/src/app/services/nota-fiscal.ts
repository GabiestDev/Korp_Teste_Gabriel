import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse, CriarNotaPayload, NotaFiscal } from '../models/nota-fiscal.model';

@Injectable({
  providedIn: 'root',
})
export class NotaFiscalService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlFaturamento;

  listarNotas(): Observable<NotaFiscal[]> {
    return this.http
      .get<ApiResponse<NotaFiscal[]>>(this.baseUrl)
      .pipe(map((r) => r.data));
  }

  criarNota(nota: CriarNotaPayload): Observable<NotaFiscal> {
    return this.http
      .post<ApiResponse<NotaFiscal>>(this.baseUrl, nota)
      .pipe(map((r) => r.data));
  }

  imprimirNota(id: number): Observable<NotaFiscal> {
    return this.http
      .post<ApiResponse<NotaFiscal>>(`${this.baseUrl}/${id}/imprimir`, {})
      .pipe(map((r) => r.data));
  }
}