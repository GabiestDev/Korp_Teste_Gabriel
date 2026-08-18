export type StatusNota = 0 | 1;

export interface NotaFiscalItem {
  id: number;
  produtoId: number;
  quantidade: number;
  notaFiscalId: number;
}

export interface NotaFiscal {
  id: number;
  numeroSequencial: number;
  status: StatusNota;
  itens: NotaFiscalItem[];
}

export interface CriarNotaPayload {
  itens: Array<{ produtoId: number; quantidade: number }>;
}

export interface MensagemApi {
  message: string;
}