import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ProdutoService } from '../../services/produto';
import { ProdutosComponent } from './produtos';

describe('ProdutosComponent', () => {
  let component: ProdutosComponent;
  let fixture: ComponentFixture<ProdutosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProdutosComponent],
      providers: [
        {
          provide: ProdutoService,
          useValue: {
            listar: () => of([]),
            criar: () => of({}),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProdutosComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
