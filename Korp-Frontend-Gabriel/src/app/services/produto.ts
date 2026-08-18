import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

const API_URL = 'http://localhost:5090/api/Estoque';

@Injectable({
  providedIn: 'root',
})
export class ProdutoService {
  constructor(private http: HttpClient) {}

  listar(): Observable<any> {
    return this.http.get(`${API_URL}/produto`);
  }

  criar(produto: any): Observable<any> {
    return this.http.post(`${API_URL}/produto`, produto);
  }
}