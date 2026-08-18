export interface Produto {
  id: number;
  codigo: string;
  descricao: string;
  saldo: number;
}

export interface CriarProdutoPayload {
  codigo: string;
  descricao: string;
  saldo: number;
}