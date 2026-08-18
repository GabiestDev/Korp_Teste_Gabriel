import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface MensagemDialogData {
  titulo: string;
  mensagem: string;
  statusCode?: number;
  erro?: boolean;
}

@Component({
  selector: 'app-mensagem-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      @if (data.statusCode != null) {
        <p class="status-code">
          <span [class.erro]="data.erro">{{ data.statusCode }}</span>
        </p>
      }
      <p class="dialog-mensagem">{{ data.mensagem }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button class="primary-btn" mat-dialog-close>OK</button>
    </mat-dialog-actions>
  `,
  styles: `
    .status-code { margin: 0 0 12px; }
    .status-code span {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 0.85rem;
      background: #e2efe8;
      color: #1b7a4a;
    }
    .status-code span.erro {
      background: #fde7e7;
      color: #b3261e;
    }
    .dialog-mensagem { margin: 0; line-height: 1.5; }
  `,
})
export class MensagemDialogComponent {
  readonly data = inject<MensagemDialogData>(MAT_DIALOG_DATA);
}