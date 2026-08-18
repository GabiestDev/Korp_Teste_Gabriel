import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { MensagemApi } from '../../models/nota-fiscal.model';
import { MensagemService } from '../../shared/mensagem.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const mensagemService = inject(MensagemService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const { mensagem, statusCode } = extrairMensagem(error);
      mensagemService.mostrarErro(mensagem, statusCode);
      return throwError(() => error);
    }),
  );
};

function extrairMensagem(error: HttpErrorResponse): { mensagem: string; statusCode?: number } {
  const corpo = error.error as MensagemApi | undefined;
  if (corpo?.message) {
    return { mensagem: corpo.message, statusCode: corpo.statusCode ?? error.status };
  }
  if (error.status === 0) {
    return { mensagem: 'Falha de conexão com o servidor. Tente novamente.' };
  }
  return { mensagem: `Erro ${error.status} ao comunicar com o servidor.`, statusCode: error.status };
}