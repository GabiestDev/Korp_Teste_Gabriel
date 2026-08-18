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
    req.flush({ id: 1, status: 'Aberta' });
  });

  it('should toggle isPrinting signal while printing', () => {
    const id = 1;

    expect(service.isPrinting()).toBe(false);

    service.imprimirNota(id).subscribe();

    expect(service.isPrinting()).toBe(true);

    const req = httpMock.expectOne(`${environment.apiUrlFaturamento}/${id}/imprimir`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, status: 'Aberta' });

    expect(service.isPrinting()).toBe(false);
  });
});