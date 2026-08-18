import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'notas-fiscais', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'produtos',
    loadComponent: () => import('./pages/produtos/produtos').then((m) => m.ProdutosComponent),
    canActivate: [authGuard],
  },
  {
    path: 'notas-fiscais',
    loadComponent: () => import('./pages/notas-fiscais/notas-fiscais').then((m) => m.NotasFiscaisComponent),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'notas-fiscais' }
];