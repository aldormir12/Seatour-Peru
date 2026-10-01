import { of } from 'rxjs';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService, API_URL, RolUsuario } from '../../services/auth.service';
import { Reserva, ReservasService, Salida, errorReserva } from '../../services/reservas.service';
import { ReservarComponent } from './reservar';
import { ReservaDetalleComponent } from './reserva-detalle';
import { ReservasListaComponent } from './reservas-lista';
import { roleGuard } from '../../guards/role.guard';

const salida: Salida = { id: 3, tourId: 1, tourNombre: 'Paseo', fecha: '2099-01-01', horaSalida: '12:00:00',
  embarcacionNombre: 'Barco', cuposDisponibles: 4, estado: 'PROGRAMADA', precioPorPasajero: 80.25, reservable: true };
const reserva: Reserva = { ninos: 0, adultos: 2, adultosMayores: 0, totalPasajeros: 2, id: 7, clienteId: 1, clienteNombre: 'Ana Perez', salidaId: 3, tourNombre: 'Paseo',
  fecha: salida.fecha, horaSalida: salida.horaSalida, embarcacionNombre: 'Barco', pasajeros: 2,
  precioUnitario: 80.25, precioTotal: 160.50, moneda: 'PEN', estado: 'PENDIENTE',
  creadaEn: '2026-09-26T15:00:00Z', confirmadaEn: null, canceladaEn: null, cuposDisponibles: 2,
  puedeConfirmar: false, puedeCancelar: true };

describe('Flujo de reservas', () => {
  let http: HttpTestingController;
  let rol: RolUsuario;
  let autenticado: boolean;
  beforeEach(() => {
    rol = 'CLIENTE'; autenticado = true;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
      { provide: AuthService, useValue: {
        usuario: signal({ id: 1, nombre: 'Ana', rol: 'CLIENTE' }),
        tieneRol: (...roles: RolUsuario[]) => roles.includes(rol), estaAutenticado: () => autenticado,
        logout: vi.fn()
      } },
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ salidaId: '3' })), snapshot: {
        paramMap: convertToParamMap({ salidaId: '3', id: '7' }), queryParamMap: convertToParamMap({}), data: {}
      } } }
    ] });
    http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => http.verify());

  it('muestra la salida real y actualiza el total sin crear reservas al continuar', () => {
    const fixture = TestBed.createComponent(ReservarComponent);
    const c = fixture.componentInstance;
    http.expectOne(`${API_URL}/salidas/3`).flush(salida);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Paseo');
    expect(fixture.nativeElement.textContent).toContain('01 Jan 2099');
    expect(fixture.nativeElement.textContent).toContain('12:00');
    const input = fixture.nativeElement.querySelector('input');
    input.value = '2';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(c.total()).toBe(160.50);
    expect(fixture.nativeElement.textContent).toContain('160.50');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No se ha creado ninguna reserva');
    http.expectNone(req => req.method !== 'GET');
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, 5, NaN])('no permite cantidad invalida %i', pasajeros => {
    const fixture = TestBed.createComponent(ReservarComponent);
    const c = fixture.componentInstance;
    http.expectOne(`${API_URL}/salidas/3`).flush(salida);
    c.pasajeros.setValue(pasajeros);
    c.continuar();
    fixture.detectChanges();
    expect(c.puedeContinuar()).toBe(false);
    expect(fixture.nativeElement.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(c.aviso()).toBe('');
    http.expectNone(req => req.method !== 'GET');
  });

  it.each([1, 4])('permite el limite de %i pasajeros', pasajeros => {
    const c = TestBed.createComponent(ReservarComponent).componentInstance;
    http.expectOne(`${API_URL}/salidas/3`).flush(salida);
    c.pasajeros.setValue(pasajeros);
    expect(c.puedeContinuar()).toBe(true);
  });

  it.each([{ cuposDisponibles: 0, reservable: true }, { cuposDisponibles: 4, reservable: false }])(
    'bloquea salidas no disponibles %o', disponibilidad => {
      const fixture = TestBed.createComponent(ReservarComponent);
      http.expectOne(`${API_URL}/salidas/3`).flush({ ...salida, ...disponibilidad });
      fixture.detectChanges();
      expect(fixture.componentInstance.puedeContinuar()).toBe(false);
      expect(fixture.nativeElement.querySelector('input')).toBeNull();
      expect(fixture.nativeElement.textContent).toContain('no admite nuevas reservas');
    });

  it('permite reintentar tras un error de carga', () => {
    const c = TestBed.createComponent(ReservarComponent).componentInstance;
    http.expectOne(`${API_URL}/salidas/3`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(c.error()).toBeTruthy();
    expect(c.salida()).toBeNull();
    c.cargar();
    http.expectOne(`${API_URL}/salidas/3`).flush(salida);
    expect(c.error()).toBe('');
    expect(c.salida()).toEqual(salida);
  });

  it('cancelar requiere confirmacion y actualiza estado, acciones y cupos', () => {
    const fixture = TestBed.createComponent(ReservaDetalleComponent);
    const c = fixture.componentInstance;
    http.expectOne(`${API_URL}/reservas/7`).flush(reserva);
    c.ejecutar(); http.expectNone(`${API_URL}/reservas/7/cancelar`);
    c.accion.set('cancelar'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('La cancelación es definitiva');
    c.ejecutar(); c.ejecutar();
    http.expectOne(`${API_URL}/reservas/7/cancelar`).flush({ ...reserva, estado: 'CANCELADA', cuposDisponibles: 4, puedeCancelar: false });
    fixture.detectChanges();
    expect(c.reserva()?.estado).toBe('CANCELADA');
    expect(TestBed.inject(ReservasService).cupos()[3]).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Cancelar reserva');
  });

  it('operador confirma desde el detalle y no descuenta cupos otra vez', () => {
    rol = 'OPERADOR';
    const fixture = TestBed.createComponent(ReservaDetalleComponent);
    const c = fixture.componentInstance;
    http.expectOne(`${API_URL}/reservas/7`).flush({ ...reserva, puedeConfirmar: true });
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Confirmar reserva');
    c.accion.set('confirmar'); c.ejecutar();
    http.expectOne(`${API_URL}/reservas/7/confirmar`).flush({ ...reserva, estado: 'CONFIRMADA', puedeConfirmar: false });
    expect(c.reserva()?.estado).toBe('CONFIRMADA');
    expect(TestBed.inject(ReservasService).cupos()[3]).toBe(2);
  });

  it('muestra mis reservas y filtra por estado', () => {
    const c = TestBed.createComponent(ReservasListaComponent).componentInstance;
    http.expectOne(`${API_URL}/reservas/mis-reservas`).flush([reserva]);
    expect(c.visibles().length).toBe(1); c.filtro.set('CANCELADA'); expect(c.visibles().length).toBe(0);
  });

  it('no muestra datos de reserva ante 404', () => {
    const c = TestBed.createComponent(ReservaDetalleComponent).componentInstance;
    http.expectOne(`${API_URL}/reservas/7`).flush({}, { status: 404, statusText: 'Not Found' });
    expect(c.reserva()).toBeNull(); expect(c.error()).toContain('No se encontró'); expect(c.cargando()).toBe(false);
  });

  it('guard exige sesion y rol de gestion', () => {
    const ejecutar = () => TestBed.runInInjectionContext(() => roleGuard(
      { data: { roles: ['OPERADOR', 'ADMIN'] } } as unknown as ActivatedRouteSnapshot,
      { url: '/gestion/reservas' } as RouterStateSnapshot));
    expect(ejecutar().toString()).toBe('/sin-acceso');
    rol = 'OPERADOR'; expect(ejecutar()).toBe(true);
    rol = 'ADMIN'; expect(ejecutar()).toBe(true);
    autenticado = false; expect(ejecutar().toString()).toBe('/login?returnUrl=%2Fgestion%2Freservas');
  });

  it.each([400, 401, 403, 404, 409, 0])('ofrece mensaje accionable para error %i', status => {
    expect(errorReserva(new HttpErrorResponse({ status }))).toBeTruthy();
  });
});
