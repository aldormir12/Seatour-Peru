import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { API_URL, AuthService, RolUsuario } from './services/auth.service';
import { inicioPorRol, reservasPorRol } from './navigation';

describe('Áreas por rol', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [App], providers: [
    provideRouter(routes), provideHttpClient(), provideHttpClientTesting()
  ] }));
  afterEach(() => {
    TestBed.inject(AuthService).logout();
    TestBed.inject(HttpTestingController).verify();
  });
  function login(rol: RolUsuario) {
    TestBed.inject(AuthService).login('ana@example.com', 'abc').subscribe();
    const token = `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).replace(/=/g, '')}.firma`;
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/auth/login`).flush({
      id: 1, nombre: 'Ana', correo: 'ana@example.com', rol, token
    });
  }
  it.each(['CLIENTE', 'OPERADOR', 'ADMIN'] as const)('monta el layout de %s y rechaza áreas ajenas', async rol => {
    login(rol);
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/app');
    await fixture.whenStable();
    if (rol === 'CLIENTE') {
      const http = TestBed.inject(HttpTestingController);
      http.expectOne(r => r.url === 'https://api.open-meteo.com/v1/forecast').flush({ current: {} });
      http.expectOne(r => r.url === 'https://marine-api.open-meteo.com/v1/marine').flush({ current: {} });
    }
    expect(router.url).toBe(inicioPorRol(rol));
    expect(fixture.nativeElement.querySelectorAll('app-reservas-nav').length).toBe(1);
    expect(fixture.nativeElement.querySelector('app-role-layout')).not.toBeNull();
    const propia = rol === 'CLIENTE' ? '/app/perfil' : `${inicioPorRol(rol)}/embarcaciones`;
    await router.navigateByUrl(propia);
    await fixture.whenStable();
    expect(router.url).toBe(propia);
    await router.navigateByUrl(reservasPorRol(rol));
    TestBed.inject(HttpTestingController).expectOne(
      `${API_URL}/reservas${rol === 'CLIENTE' ? '/mis-reservas' : ''}`
    ).flush([]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('app-reservas-nav').length).toBe(1);
    for (const ajena of ['/app/perfil', '/app/operador/embarcaciones', '/app/admin/usuarios']) {
      if ((rol === 'CLIENTE' && ajena === '/app/perfil') || ajena.startsWith(inicioPorRol(rol) + '/')) continue;
      await router.navigateByUrl(ajena);
      expect(router.url).toBe('/sin-acceso');
    }
  });
  it('protege enlaces directos y conserva parámetros de URLs antiguas', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/salidas?tourId=8');
    expect(router.url).toBe('/login?returnUrl=%2Fapp%2Ftours%3FtourId%3D8');
    login('ADMIN');
    await router.navigateByUrl('/reservas/7?creada=1');
    await fixture.whenStable();
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/reservas/7`)
      .flush({}, { status: 404, statusText: 'Not Found' });
    expect(router.url).toBe('/app/admin/reservas/7?creada=1');
  });
  it('expulsa la sesión perdida también desde perfil', async () => {
    login('CLIENTE');
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/app/perfil');
    await fixture.whenStable();
    TestBed.inject(AuthService).logout();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.url).toContain('/login?');
    expect(router.url).toContain('sesion=expirada');
    expect(fixture.nativeElement.querySelector('app-private-layout')).toBeNull();
  });
});
