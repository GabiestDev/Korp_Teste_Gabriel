import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/nota-fiscal.model';
import { CriarProdutoPayload, Produto } from '../models/produto.model';

@Injectable({
  providedIn: 'root',
})
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlEstoque;

  listar(): Observable<Produto[]> {
    return this.http
      .get<ApiResponse<Produto[]>>(`${this.baseUrl}/produto`)
      .pipe(map((r) => r.data));
  }

  criar(produto: CriarProdutoPayload): Observable<Produto> {
    return this.http
      .post<ApiResponse<Produto>>(`${this.baseUrl}/produto`, produto)
      .pipe(map((r) => r.data));
  }
}