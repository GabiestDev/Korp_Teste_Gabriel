import { AfterViewInit, Component, ChangeDetectionStrategy, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap } from 'rxjs';

import { ProdutoService } from '../../services/produto';
import { Produto } from '../../models/produto.model';

@Component({
  selector: 'app-produtos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './produtos.html',
})
export class ProdutosComponent implements AfterViewInit {
  private readonly produtoService = inject(ProdutoService);
  private readonly snackBar = inject(MatSnackBar);

  produtos = signal<Produto[]>([]);
  dataSource = new MatTableDataSource<Produto>();
  colunas: string[] = ['codigo', 'descricao', 'saldo'];

  @ViewChild(MatSort) sort?: MatSort;
  @ViewChild(MatPaginator) paginator?: MatPaginator;

  novoCodigo = '';
  novaDescricao = '';
  novoSaldo = 0;

  constructor() {
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
        this.produtos.set(produtos);
        this.dataSource.data = produtos;
        setTimeout(() => this.conectarDataSource());
      },
    });
  }

  criarProduto(): void {
    const codigo = this.novoCodigo.trim();
    const descricao = this.novaDescricao.trim();

    if (!codigo || !descricao || this.novoSaldo < 0) {
      this.snackBar.open('Preencha código, descrição e saldo válido antes de cadastrar.', 'Fechar', {
        duration: 6000,
        panelClass: ['erro-snackbar'],
      });
      return;
    }

    const produto = { codigo, descricao, saldo: Number(this.novoSaldo) };

    this.produtoService
      .criar(produto)
      .pipe(switchMap(() => this.produtoService.listar()))
      .subscribe({
        next: (produtos) => {
          this.produtos.set(produtos);
          this.dataSource.data = produtos;
          this.novoCodigo = '';
          this.novaDescricao = '';
          this.novoSaldo = 0;
          setTimeout(() => this.conectarDataSource());
        },
      });
  }
}