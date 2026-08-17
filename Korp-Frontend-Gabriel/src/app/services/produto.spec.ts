import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { ProdutoService } from './produto';

describe('ProdutoService', () => {
  let service: ProdutoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
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

    const req = httpMock.expectOne('http://localhost:5164/api/Estoque/produto');
    expect(req.request.method).toBe('GET');
    req.flush(mockProducts);
  });
});
