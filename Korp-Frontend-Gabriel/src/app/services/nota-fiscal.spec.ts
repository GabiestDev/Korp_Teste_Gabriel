import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { NotaFiscalService } from './nota-fiscal';
import { environment } from '../../environments/environment';

describe('NotaFiscalService', () => {
  let service: NotaFiscalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(NotaFiscalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a new invoice with the billing microservice', () => {
    const payload = { itens: [{ produtoId: 1, quantidade: 2 }] };

    service.criarNota(payload).subscribe((response) => {
      expect(response).toEqual({ id: 1, status: 'Aberta' });
    });

    const req = httpMock.expectOne(`${environment.apiUrlFaturamento}`);
    expect(req.request.method).toBe('POST');
    req.flush({ statusCode: 201, message: 'ok', timestamp: '2026-01-01', data: { id: 1, status: 'Aberta' } });
  });

  it('should print an invoice via the billing microservice', () => {
    const id = 1;

    service.imprimirNota(id).subscribe((response) => {
      expect(response).toEqual({ id: 1, status: 'Fechada' });
    });

    const req = httpMock.expectOne(`${environment.apiUrlFaturamento}/${id}/imprimir`);
    expect(req.request.method).toBe('POST');
    req.flush({ statusCode: 200, message: 'ok', timestamp: '2026-01-01', data: { id: 1, status: 'Fechada' } });
  });
});