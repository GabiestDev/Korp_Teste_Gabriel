import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ProdutoService } from '../../services/produto';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatTableModule, MatButtonModule, MatInputModule, MatFormFieldModule],
  templateUrl: './produtos.html',
})
export class ProdutosComponent implements OnInit {
  produtos: any[] = [];
  colunas: string[] = ['codigo', 'descricao', 'saldo'];

  novoCodigo = '';
  novaDescricao = '';
  novoSaldo = 0;

  constructor(private produtoService: ProdutoService) {}

  ngOnInit() {
    this.carregarProdutos();
  }

  carregarProdutos() {
    this.produtoService.listar().subscribe({
      next: (res: any) => (this.produtos = res),
      error: (err: any) => console.error('Erro ao buscar produtos:', err),
    });
  }

  criarProduto() {
    const codigo = this.novoCodigo.trim();
    const descricao = this.novaDescricao.trim();

    if (!codigo || !descricao || this.novoSaldo < 0) {
      alert('Preencha código, descrição e saldo válido antes de cadastrar.');
      return;
    }

    const produto = { codigo, descricao, saldo: Number(this.novoSaldo) };

    this.produtoService.criar(produto).subscribe({
      next: () => {
        this.carregarProdutos();
        this.novoCodigo = '';
        this.novaDescricao = '';
        this.novoSaldo = 0;
      },
      error: (err: any) => {
        console.error('Erro ao criar produto:', err);
        alert(err?.error?.message ?? 'Erro ao cadastrar produto.');
      },
    });
  }
}