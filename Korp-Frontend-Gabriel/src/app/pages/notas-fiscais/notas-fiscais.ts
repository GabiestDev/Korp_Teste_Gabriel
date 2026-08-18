import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
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

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './notas-fiscais.html',
})
export class NotasFiscaisComponent {
  private readonly notaFiscalService = inject(NotaFiscalService);
  private readonly produtoService = inject(ProdutoService);

  notas = signal<NotaFiscal[]>([]);
  produtosDisponiveis = signal<Produto[]>([]);
  colunas: string[] = ['numeroSequencial', 'produtos', 'status', 'acoes'];

  novoProdutoId = 0;
  novaQuantidade = 1;
  itensAdicionados = signal<Array<{ produtoId: number; quantidade: number }>>([]);
  imprimindoId = signal<number | null>(null);

  constructor() {
    this.carregarNotas();
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.produtoService.listar().subscribe({
      next: (produtos) => {
        this.produtosDisponiveis.set(produtos);
        if (produtos.length && !this.novoProdutoId) {
          this.novoProdutoId = produtos[0].id;
        }
      },
    });
  }

  carregarNotas(): void {
    this.notaFiscalService.listarNotas().subscribe({
      next: (notas) => this.notas.set(notas),
    });
  }

  adicionarItem(): void {
    if (!this.novoProdutoId || this.novaQuantidade <= 0) {
      alert('Informe um produto válido e uma quantidade maior que zero.');
      return;
    }

    this.itensAdicionados.update((itens) => [
      ...itens,
      { produtoId: this.novoProdutoId, quantidade: this.novaQuantidade },
    ]);

    this.novaQuantidade = 1;
  }

  criarNota(): void {
    if (!this.itensAdicionados().length) {
      alert('Adicione ao menos um item antes de criar a nota fiscal.');
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
        },
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
        next: (notas) => this.notas.set(notas),
      });
  }

  obterStatusTexto(status: StatusNota): string {
    return status === 1 ? 'Fechada' : 'Aberta';
  }

  obterStatusColor(status: StatusNota): string {
    return status === 1 ? 'green' : 'orange';
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