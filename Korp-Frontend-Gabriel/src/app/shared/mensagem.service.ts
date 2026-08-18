import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MensagemDialogComponent, MensagemDialogData } from './mensagem-dialog/mensagem-dialog';

@Injectable({ providedIn: 'root' })
export class MensagemService {
  private readonly dialog = inject(MatDialog);

  mostrarErro(mensagem: string, statusCode?: number): void {
    this.abrir({ titulo: 'Atenção', mensagem, statusCode, erro: true });
  }

  mostrarSucesso(mensagem: string, statusCode?: number): void {
    this.abrir({ titulo: 'Sucesso', mensagem, statusCode, erro: false });
  }

  private abrir(data: MensagemDialogData): void {
    this.dialog.open(MensagemDialogComponent, { data, width: '420px' });
  }
}