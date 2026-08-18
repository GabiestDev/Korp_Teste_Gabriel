import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

import { MensagemApi } from '../../models/nota-fiscal.model';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const mensagem = extrairMensagem(error);
      snackBar.open(mensagem, 'Fechar', {
        duration: 6000,
        panelClass: ['erro-snackbar'],
      });
      return throwError(() => error);
    }),
  );
};

function extrairMensagem(error: HttpErrorResponse): string {
  const corpo = error.error as MensagemApi | undefined;
  if (corpo?.message) {
    return corpo.message;
  }
  if (error.status === 0) {
    return 'Falha de conexão com o servidor. Tente novamente.';
  }
  return `Erro ${error.status} ao comunicar com o servidor.`;
}