import { AfterViewInit, Component, ChangeDetectionStrategy, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { finalize, switchMap } from 'rxjs';

import { NotaFiscalService } from '../../services/nota-fiscal';
import { ProdutoService } from '../../services/produto';
import { NotaFiscal, NotaFiscalItem, StatusNota } from '../../models/nota-fiscal.model';
import { Produto } from '../../models/produto.model';
import { MensagemService } from '../../shared/mensagem.service';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './notas-fiscais.html',
})
export class NotasFiscaisComponent implements AfterViewInit {
  private readonly notaFiscalService = inject(NotaFiscalService);
  private readonly produtoService = inject(ProdutoService);
  private readonly mensagemService = inject(MensagemService);
  private readonly fb = inject(FormBuilder);

  notas = signal<NotaFiscal[]>([]);
  dataSource = new MatTableDataSource<NotaFiscal>();
  produtosDisponiveis = signal<Produto[]>([]);
  colunas: string[] = ['numeroSequencial', 'dataCriacao', 'produtos', 'status', 'acoes'];

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  itemForm = this.fb.nonNullable.group({
    produtoId: [0, [Validators.required, Validators.min(1)]],
    quantidade: [1, [Validators.required, Validators.min(1)]],
  });

  itensAdicionados = signal<Array<{ produtoId: number; quantidade: number }>>([]);
  imprimindoId = signal<number | null>(null);

  get f() {
    return this.itemForm.controls;
  }

  constructor() {
    this.carregarNotas();
    this.carregarProdutos();
  }

  ngAfterViewInit(): void {
    this.conectarDataSource();
  }

  private conectarDataSource(): void {
    this.dataSource.sort = this.sort ?? null;
    this.dataSource.paginator = this.paginator ?? null;
  }

  carregarProdutos(): void {
    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtosDisponiveis.set(produtos);
        if (produtos.length && !this.f.produtoId.value) {
          this.itemForm.patchValue({ produtoId: produtos[0].id });
        }
      },
      error: () => {},
    });
  }

  carregarNotas(): void {
    this.notaFiscalService.listarNotas().subscribe({
      next: (notas) => {
        this.notas.set(notas);
        this.dataSource.data = notas;
        setTimeout(() => this.conectarDataSource());
      },
      error: () => {},
    });
  }

  adicionarItem(): void {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      this.mensagemService.mostrarErro('Informe um produto válido e uma quantidade maior que zero.');
      return;
    }

    const { produtoId, quantidade } = this.itemForm.getRawValue();

    if (this.itensAdicionados().some((item) => item.produtoId === produtoId)) {
      this.mensagemService.mostrarErro('Este produto já foi adicionado à nota atual.');
      return;
    }

    this.itensAdicionados.update((itens) => [...itens, { produtoId, quantidade }]);
    this.itemForm.patchValue({ quantidade: 1 });
  }

  criarNota(): void {
    if (!this.itensAdicionados().length) {
      this.mensagemService.mostrarErro('Adicione ao menos um item antes de criar a nota fiscal.');
      return;
    }

    const novaNota = { itens: this.itensAdicionados() };

    this.notaFiscalService
      .criarNota(novaNota)
      .pipe(switchMap(() => this.notaFiscalService.listarNotas()))
      .subscribe({
        next: (notas) => {
          this.itensAdicionados.set([]);
          this.notas.set(notas);
          this.dataSource.data = notas;
          setTimeout(() => this.conectarDataSource());
          this.mensagemService.mostrarSucesso('Nota fiscal criada com sucesso.', 201);
        },
        error: () => {},
      });
  }

  imprimir(id: number): void {
    this.imprimindoId.set(id);

    this.notaFiscalService
      .imprimirNota(id)
      .pipe(
        switchMap(() => this.notaFiscalService.listarNotas()),
        finalize(() => this.imprimindoId.set(null)),
      )
      .subscribe({
        next: (notas) => {
          this.notas.set(notas);
          this.dataSource.data = notas;
          setTimeout(() => this.conectarDataSource());
          this.mensagemService.mostrarSucesso('Nota fiscal impressa e fechada com sucesso!', 200);
        },
        error: () => {},
      });
  }

  obterStatusTexto(status: StatusNota): string {
    return status === 1 ? 'Fechada' : 'Aberta';
  }

  obterStatusColor(status: StatusNota): string {    return status === 1 ? 'green' : 'orange';
  }

  obterDescricaoProduto(produtoId: number): string {
    const produto = this.produtosDisponiveis().find((item) => item.id === produtoId);
    if (produto) {
      return `${produto.descricao} (${produto.codigo})`;
    }

    return `Produto ${produtoId}`;
  }

  obterProdutosDaNota(itens: NotaFiscalItem[]): string {
    return itens
      .map((item) => `${this.obterDescricaoProduto(item.produtoId)} x${item.quantidade}`)
      .join(', ');
  }
}