export interface Produto {
  id: number;
  codigo: string;
  descricao: string;
  saldo: number;
  dataCriacao: string;
}

export interface CriarProdutoPayload {
  codigo: string;
  descricao: string;
  saldo: number;
}