import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ProdutoService } from '../../services/produto';
import { ProdutosComponent } from './produtos';
import { MensagemService } from '../../shared/mensagem.service';

describe('ProdutosComponent', () => {
  let component: ProdutosComponent;
  let fixture: ComponentFixture<ProdutosComponent>;

  const produtoService = {
    listar: vi.fn(),
    criar: vi.fn(),
  };

  const mensagemService = {
    mostrarErro: vi.fn(),
    mostrarSucesso: vi.fn(),
  };

  beforeEach(async () => {
    produtoService.listar.mockReturnValue(of([]));
    produtoService.criar.mockReturnValue(of({}));
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [
        { provide: ProdutoService, useValue: produtoService },
        { provide: MensagemService, useValue: mensagemService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProdutosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar produtos ao iniciar', () => {
    expect(produtoService.listar).toHaveBeenCalled();
  });

  it('não deve cadastrar produto com formulário inválido', () => {
    component.form.patchValue({ codigo: '', descricao: '', saldo: -1 });
    component.criarProduto();

    expect(produtoService.criar).not.toHaveBeenCalled();
    expect(mensagemService.mostrarErro).toHaveBeenCalled();
  });

  it('deve cadastrar produto válido e recarregar a lista', () => {
    component.form.patchValue({ codigo: 'ABC-123', descricao: 'Produto Teste', saldo: 10 });
    component.criarProduto();

    expect(produtoService.criar).toHaveBeenCalledWith({
      codigo: 'ABC-123',
      descricao: 'Produto Teste',
      saldo: 10,
    });
    expect(mensagemService.mostrarSucesso).toHaveBeenCalled();
  });
});