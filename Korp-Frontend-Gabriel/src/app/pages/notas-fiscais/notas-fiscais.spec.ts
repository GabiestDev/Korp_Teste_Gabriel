import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';

import { NotaFiscalService } from '../../services/nota-fiscal';
import { ProdutoService } from '../../services/produto';
import { NotasFiscaisComponent } from './notas-fiscais';

describe('NotasFiscaisComponent', () => {
  let component: NotasFiscaisComponent;
  let fixture: ComponentFixture<NotasFiscaisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasFiscaisComponent],
      providers: [
        {
          provide: NotaFiscalService,
          useValue: {
            listarNotas: () => of([]),
            criarNota: () => of({}),
            imprimirNota: () => of({}),
          },
        },
        {
          provide: ProdutoService,
          useValue: {
            listar: () => of([]),
          },
        },
        {
          provide: MatSnackBar,
          useValue: { open: () => {} },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasFiscaisComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
