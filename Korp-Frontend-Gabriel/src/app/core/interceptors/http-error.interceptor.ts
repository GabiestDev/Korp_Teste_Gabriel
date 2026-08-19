import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { MensagemApi } from '../../models/nota-fiscal.model';
import { AuthService } from '../services/auth.service';
import { MensagemService } from '../../shared/mensagem.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const mensagemService = inject(MensagemService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const ehLogin = req.url.includes('/auth/login');

      if (error.status === 401 && !ehLogin) {
        mensagemService.mostrarErro('Sessão expirada ou inválida. Faça login novamente.');
        authService.logout();
        router.navigate(['/login']);
        return throwError(() => error);
      }

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
