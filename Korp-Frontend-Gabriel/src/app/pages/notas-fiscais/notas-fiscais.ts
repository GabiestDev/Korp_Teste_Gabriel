import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NotaFiscalService } from '../../services/nota-fiscal';
import { ProdutoService } from '../../services/produto';

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
export class NotasFiscaisComponent implements OnInit {
  notas: any[] = [];
  produtosDisponiveis: any[] = [];
  colunas: string[] = ['numeroSequencial', 'produtos', 'status', 'acoes'];

  novoProdutoId = 0;
  novaQuantidade = 1;
  itensAdicionados: Array<{ produtoId: number; quantidade: number }> = [];
  imprimindoId: number | null = null;

  constructor(
    private notaFiscalService: NotaFiscalService,
    private produtoService: ProdutoService,
  ) {}

  ngOnInit() {
    this.carregarNotas();
    this.carregarProdutos();
  }

  carregarProdutos() {
    this.produtoService.listar().subscribe({
      next: (res: any[]) => {
        this.produtosDisponiveis = res;
        if (res.length && !this.novoProdutoId) {
          this.novoProdutoId = Number(res[0].id ?? res[0].produtoId ?? 1);
        }
      },
      error: (err: any) => console.error('Erro ao buscar produtos:', err),
    });
  }

  carregarNotas() {
    this.notaFiscalService.listarNotas().subscribe((res: any) => (this.notas = res));
  }

  adicionarItem() {
    if (!this.novoProdutoId || this.novaQuantidade <= 0) {
      alert('Informe um produto válido e uma quantidade maior que zero.');
      return;
    }

    this.itensAdicionados.push({
      produtoId: Number(this.novoProdutoId),
      quantidade: Number(this.novaQuantidade),
    });

    this.novaQuantidade = 1;
  }

  criarNota() {
    if (!this.itensAdicionados.length) {
      alert('Adicione ao menos um item antes de criar a nota fiscal.');
      return;
    }

    const novaNota = { itens: this.itensAdicionados };

    this.notaFiscalService.criarNota(novaNota).subscribe({
      next: () => {
        this.itensAdicionados = [];
        this.carregarNotas();
      },
      error: (err: any) => {
        console.error('Erro ao criar nota:', err);
        alert(err?.error?.message ?? 'Erro ao criar nota fiscal.');
      },
    });
  }

  imprimir(id: number) {
    this.imprimindoId = id;

    this.notaFiscalService.imprimirNota(id).subscribe({
      next: () => {
        this.imprimindoId = null;
        this.carregarNotas();
      },
      error: (err: any) => {
        this.imprimindoId = null;
        console.error('Erro na API:', err);
        alert(err?.error?.message ?? 'Erro ao imprimir a nota fiscal.');
      },
    });
  }

  obterStatusTexto(status: number | string): string {
    return status === 1 || status === 'Fechada' ? 'Fechada' : 'Aberta';
  }

  obterStatusColor(status: number | string): string {
    return status === 1 || status === 'Fechada' ? 'green' : 'orange';
  }

  obterDescricaoProduto(produtoId: number): string {
    const produto = this.produtosDisponiveis.find((item) => Number(item.id) === Number(produtoId));
    if (produto) {
      return `${produto.descricao} (${produto.codigo})`;
    }

    return `Produto ${produtoId}`;
  }
}