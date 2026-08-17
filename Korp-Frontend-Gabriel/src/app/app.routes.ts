import { Routes } from '@angular/router';
import { ProdutosComponent } from './pages/produtos/produtos';
import { NotasFiscaisComponent } from './pages/notas-fiscais/notas-fiscais';

export const routes: Routes = [
  { path: '', redirectTo: 'notas-fiscais', pathMatch: 'full' },
  { path: 'produtos', component: ProdutosComponent },
  { path: 'notas-fiscais', component: NotasFiscaisComponent }
];