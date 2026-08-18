import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, finalize, throwError } from 'rxjs';

const API_URL = 'http://localhost:5164/api/NotaFiscal';

@Injectable({
  providedIn: 'root'
})
export class NotaFiscalService {
  private isPrintingSubject = new BehaviorSubject<boolean>(false);
  public isPrinting$ = this.isPrintingSubject.asObservable();

  constructor(private http: HttpClient) { }

  listarNotas(): Observable<any> {
    return this.http.get(`${API_URL}`);
  }

  criarNota(nota: any): Observable<any> {
    return this.http.post(`${API_URL}`, nota);
  }

  imprimirNota(id: number): Observable<any> {
    this.isPrintingSubject.next(true); 

    return this.http.post(`${API_URL}/${id}/imprimir`, {}).pipe(
      catchError(error => {
        console.error('Erro na impressão:', error);
        return throwError(() => error);
      }),
      finalize(() => {
        this.isPrintingSubject.next(false);
      })
    );
  }
}