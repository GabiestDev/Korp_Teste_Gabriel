import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { switchMap } from 'rxjs';

import { ProdutoService } from '../../services/produto';
import { Produto } from '../../models/produto.model';

@Component({
  selector: 'app-produtos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatInputModule, MatFormFieldModule],
  templateUrl: './produtos.html',
})
export class ProdutosComponent {
  private readonly produtoService = inject(ProdutoService);

  produtos = signal<Produto[]>([]);
  colunas: string[] = ['codigo', 'descricao', 'saldo'];

  novoCodigo = '';
  novaDescricao = '';
  novoSaldo = 0;

  constructor() {
    this.carregarProdutos();
  }

  carregarProdutos(): void {
    this.produtoService.listar().subscribe({
      next: (produtos) => this.produtos.set(produtos),
    });
  }

  criarProduto(): void {
    const codigo = this.novoCodigo.trim();
    const descricao = this.novaDescricao.trim();

    if (!codigo || !descricao || this.novoSaldo < 0) {
      alert('Preencha código, descrição e saldo válido antes de cadastrar.');
      return;
    }

    const produto = { codigo, descricao, saldo: Number(this.novoSaldo) };

    this.produtoService
      .criar(produto)
      .pipe(switchMap(() => this.produtoService.listar()))
      .subscribe({
        next: (produtos) => {
          this.produtos.set(produtos);
          this.novoCodigo = '';
          this.novaDescricao = '';
          this.novoSaldo = 0;
        },
      });
  }
}