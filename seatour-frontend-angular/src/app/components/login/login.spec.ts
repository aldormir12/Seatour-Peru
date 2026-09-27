import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login';
import { API_URL, AuthService } from '../../services/auth.service';

describe('Login', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [LoginComponent],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); TestBed.inject(AuthService).logout(); });

  it.each([
    ['CLIENTE', '/app/dashboard'], ['OPERADOR', '/app/operador'], ['ADMIN', '/app/admin']
  ])('acepta claves existentes cortas y entra en el panel de %s', (rol, destino) => {
    const component = TestBed.createComponent(LoginComponent).componentInstance;
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.formulario.setValue({ correo: 'ana@example.com', password: 'abc' });
    component.iniciarSesion();
    component.iniciarSesion();
    const token = `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).replace(/=/g, '')}.firma`;
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/auth/login`).flush({
      id: 1, nombre: 'Ana', correo: 'ana@example.com', rol, token
    });
    expect(navigate).toHaveBeenCalledWith(destino);
    expect(TestBed.inject(AuthService).estaAutenticado()).toBe(true);
  });

  it.each([401, 503])('muestra el error adecuado para HTTP %i', status => {
    const fixture = TestBed.createComponent(LoginComponent);
    const component = fixture.componentInstance;
    component.formulario.setValue({ correo: 'ana@example.com', password: 'secreto' });
    component.iniciarSesion();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/auth/login`)
      .flush({}, { status, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent)
      .toContain(status === 401 ? 'incorrectos' : 'No se pudo');
    expect(component.cargando()).toBe(false);
  });
});
