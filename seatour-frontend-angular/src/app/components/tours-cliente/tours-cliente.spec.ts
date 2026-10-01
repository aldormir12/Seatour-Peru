import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NavigationStart, Router, provideRouter } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';
import { API_URL, AuthService } from '../../services/auth.service';
import { Tour } from '../../services/tours';
import { ToursCliente } from './tours-cliente';

describe('Navegación del catálogo', () => {
  afterEach(() => {
    TestBed.inject(AuthService).logout();
    TestBed.inject(HttpTestingController).verify();
  });

  it('el clic de Ver tour abre el modal una vez sin navegar, incluidos los layouts reales', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [
      provideRouter(routes), provideHttpClient(), provideHttpClientTesting()
    ] });
    const http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).login('cliente@example.com', 'prueba').subscribe();
    const token = `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).replace(/=/g, '')}.firma`;
    http.expectOne(`${API_URL}/auth/login`).flush({
      id: 1, nombre: 'Cliente', correo: 'cliente@example.com', rol: 'CLIENTE', token
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/app/tours');
    fixture.detectChanges();
    expect(router.url).toBe('/app/tours');
    const tour: Tour = { id: 1, nombre: 'Tour de prueba', descripcion: 'Descripción',
      duracionMinutos: 60, precioBase: 50, activo: true, categoriaId: 1, imagenUrl: null };
    http.expectOne(`${API_URL}/tours`).flush([tour]);
    http.expectOne(`${API_URL}/categorias`).flush([{ id: 1, nombre: 'Mar', activo: true }]);
    await fixture.whenStable();
    fixture.detectChanges();
    const componente = fixture.debugElement.query(By.directive(ToursCliente)).componentInstance as ToursCliente;
    const abrir = vi.spyOn(componente, 'abrirTour');
    const navegaciones: string[] = [];
    const sub = router.events.subscribe(event => {
      if (event instanceof NavigationStart) navegaciones.push(event.url);
    });
    const boton = fixture.nativeElement.querySelector('[aria-label="Ver tour: Tour de prueba"]') as HTMLElement;
    expect(boton.tagName).toBe('BUTTON');
    expect(boton.closest('a')).toBeNull();
    boton.click();
    http.expectOne(`${API_URL}/salidas/tour/1/disponibles`).flush([]);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(abrir).toHaveBeenCalledExactlyOnceWith(tour);
    expect(componente.modalAbierto()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(router.url).toBe('/app/tours');
    expect(navegaciones).toEqual([]);
    sub.unsubscribe();
  });
});
