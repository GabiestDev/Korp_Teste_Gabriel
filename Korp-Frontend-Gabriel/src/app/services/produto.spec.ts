import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { ProdutoService } from './produto';
import { environment } from '../../environments/environment';

describe('ProdutoService', () => {
  let service: ProdutoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ProdutoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should list products from the estoque microservice', () => {
    const mockProducts = [{ id: 1, codigo: 'P001', descricao: 'Teclado', saldo: 10 }];

    service.listar().subscribe((products) => {
      expect(products).toEqual(mockProducts);
    });

    const req = httpMock.expectOne(`${environment.apiUrlEstoque}/produto`);
    expect(req.request.method).toBe('GET');
    req.flush({ statusCode: 200, message: 'ok', timestamp: '2026-01-01', data: mockProducts });
  });
});