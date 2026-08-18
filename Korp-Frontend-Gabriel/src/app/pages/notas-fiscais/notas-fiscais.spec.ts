import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { NotaFiscalService } from '../../services/nota-fiscal';
import { ProdutoService } from '../../services/produto';
import { NotasFiscaisComponent } from './notas-fiscais';
import { MensagemService } from '../../shared/mensagem.service';

describe('NotasFiscaisComponent', () => {
  let component: NotasFiscaisComponent;
  let fixture: ComponentFixture<NotasFiscaisComponent>;

  const notaFiscalService = {
    listarNotas: vi.fn(),
    criarNota: vi.fn(),
    imprimirNota: vi.fn(),
  };

  const produtoService = {
    listar: vi.fn(),
  };

  const mensagemService = {
    mostrarErro: vi.fn(),
    mostrarSucesso: vi.fn(),
  };

  beforeEach(async () => {
    notaFiscalService.listarNotas.mockReturnValue(of([]));
    notaFiscalService.criarNota.mockReturnValue(of({}));
    notaFiscalService.imprimirNota.mockReturnValue(of({}));
    produtoService.listar.mockReturnValue(
      of([
        { id: 1, codigo: 'A1', descricao: 'Produto A', saldo: 5 },
        { id: 2, codigo: 'B2', descricao: 'Produto B', saldo: 8 },
      ]),
    );
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [NotasFiscaisComponent],
      providers: [
        { provide: NotaFiscalService, useValue: notaFiscalService },
        { provide: ProdutoService, useValue: produtoService },
        { provide: MensagemService, useValue: mensagemService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasFiscaisComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve carregar notas e produtos ao iniciar', () => {
    expect(notaFiscalService.listarNotas).toHaveBeenCalled();
    expect(produtoService.listar).toHaveBeenCalled();
  });

  it('deve pré-selecionar o primeiro produto disponível', () => {
    expect(component.f.produtoId.value).toBe(1);
  });

  it('não deve adicionar item com quantidade inválida', () => {
    component.itemForm.patchValue({ produtoId: 1, quantidade: 0 });
    component.adicionarItem();

    expect(component.itensAdicionados().length).toBe(0);
    expect(mensagemService.mostrarErro).toHaveBeenCalled();
  });

  it('deve adicionar um item válido à nota', () => {
    component.itemForm.patchValue({ produtoId: 1, quantidade: 3 });
    component.adicionarItem();

    expect(component.itensAdicionados()).toEqual([{ produtoId: 1, quantidade: 3 }]);
  });

  it('não deve permitir produto duplicado na mesma nota', () => {
    component.itemForm.patchValue({ produtoId: 1, quantidade: 3 });
    component.adicionarItem();

    component.itemForm.patchValue({ produtoId: 1, quantidade: 2 });
    component.adicionarItem();

    expect(component.itensAdicionados().length).toBe(1);
    expect(mensagemService.mostrarErro).toHaveBeenCalledWith(
      'Este produto já foi adicionado à nota atual.',
    );
  });

  it('não deve criar nota sem itens', () => {
    component.criarNota();

    expect(notaFiscalService.criarNota).not.toHaveBeenCalled();
    expect(mensagemService.mostrarErro).toHaveBeenCalled();
  });

  it('deve criar nota com itens e recarregar a lista', () => {
    component.itemForm.patchValue({ produtoId: 2, quantidade: 4 });
    component.adicionarItem();
    component.criarNota();

    expect(notaFiscalService.criarNota).toHaveBeenCalledWith({
      itens: [{ produtoId: 2, quantidade: 4 }],
    });
    expect(mensagemService.mostrarSucesso).toHaveBeenCalled();
    expect(component.itensAdicionados().length).toBe(0);
  });
});