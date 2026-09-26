import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RegistroComponent } from './registro';
import { API_URL, AuthService } from '../../services/auth.service';

describe('Registro', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [RegistroComponent],
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] }));
  afterEach(() => { TestBed.inject(HttpTestingController).verify(); TestBed.inject(AuthService).logout(); });

  it('valida campos vacios y confirmacion antes de enviar', () => {
    const fixture = TestBed.createComponent(RegistroComponent);
    const component = fixture.componentInstance;
    component.registrar();
    expect(component.formulario.touched).toBe(true);
    component.formulario.setValue({ nombre: 'Ana', apellido: 'Perez', correo: 'ana@example.com',
      password: 'secreto', confirmacion: 'distinta' });
    component.registrar();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('no coinciden');
    TestBed.inject(HttpTestingController).expectNone(`${API_URL}/usuarios`);
  });

  it('muestra correo duplicado y permite corregir sin envios simultaneos', () => {
    const component = TestBed.createComponent(RegistroComponent).componentInstance;
    component.formulario.setValue({ nombre: 'Ana', apellido: 'Perez', correo: 'ana@example.com',
      password: 'secreto', confirmacion: 'secreto' });
    component.registrar();
    component.registrar();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/usuarios`)
      .flush({}, { status: 409, statusText: 'Conflict' });
    expect(component.error()).toContain('registrado');
    expect(component.cargando()).toBe(false);
  });
});
