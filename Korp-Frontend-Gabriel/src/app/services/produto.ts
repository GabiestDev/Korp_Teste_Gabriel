import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { CriarProdutoPayload, Produto } from '../models/produto.model';

@Injectable({
  providedIn: 'root',
})
export class ProdutoService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrlEstoque;

  listar(): Observable<Produto[]> {
    return this.http.get<Produto[]>(`${this.baseUrl}/produto`);
  }

  criar(produto: CriarProdutoPayload): Observable<Produto> {
    return this.http.post<Produto>(`${this.baseUrl}/produto`, produto);
  }
}