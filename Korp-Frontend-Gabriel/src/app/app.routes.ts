import { Routes } from '@angular/router';
import { ProdutosComponent } from './pages/produtos/produtos';
import { NotasFiscaisComponent } from './pages/notas-fiscais/notas-fiscais';
import { LoginComponent } from './pages/login/login';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'notas-fiscais', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'produtos', component: ProdutosComponent, canActivate: [authGuard] },
  { path: 'notas-fiscais', component: NotasFiscaisComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'notas-fiscais' }
];