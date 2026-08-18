import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

import { LoginComponent } from './login';
import { AuthService } from '../../core/services/auth.service';
import { MensagemService } from '../../shared/mensagem.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  const authService = {
    login: vi.fn(),
  };

  const mensagemService = {
    mostrarErro: vi.fn(),
  };

  const router = {
    navigate: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: MensagemService, useValue: mensagemService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('deve mostrar erro quando campos estão vazios', () => {
    component.entrar();

    expect(component.mensagemErro).toBe('Informe usuário e senha para entrar.');
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('deve chamar login com credenciais válidas e navegar', () => {
    authService.login.mockReturnValue(of({ nome: 'gabriel', username: 'gabriel' }));

    component.form.patchValue({ username: 'gabriel', senha: 'senha123' });
    component.entrar();

    expect(authService.login).toHaveBeenCalledWith('gabriel', 'senha123');
    expect(router.navigate).toHaveBeenCalledWith(['/notas-fiscais']);
  });

  it('deve tratar credenciais inválidas (401)', () => {
    authService.login.mockReturnValue(throwError(() => ({ status: 401, message: 'Unauthorized' })));

    component.form.patchValue({ username: 'gabriel', senha: 'errada' });
    component.entrar();

    expect(component.mensagemErro).toBe('Usuário ou senha inválidos.');
    expect(mensagemService.mostrarErro).toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});