import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { NotaFiscalService } from './nota-fiscal';

describe('NotaFiscalService', () => {
  let service: NotaFiscalService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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

    const req = httpMock.expectOne('http://localhost:5164/api/NotaFiscal');
    expect(req.request.method).toBe('POST');
    req.flush({ id: 1, status: 'Aberta' });
  });
});
