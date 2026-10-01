import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RecomendacionesComponent } from './recomendaciones';
import { Tours } from '../../../services/tours';
import { SalidaProgramada } from '../../../services/salidas.service';
import { API_URL } from '../../../services/auth.service';

const tarifas = [
  { tipo: 'NINO', nombre: 'Ni\u00f1o', edadMinima: 0, edadMaxima: 12, porcentajeDescuento: 30 },
  { tipo: 'ADULTO', nombre: 'Adulto', edadMinima: 13, edadMaxima: 59, porcentajeDescuento: 0 },
  { tipo: 'ADULTO_MAYOR', nombre: 'Adulto mayor', edadMinima: 60, edadMaxima: null, porcentajeDescuento: 20 }
];
const salida = { id: 3, tourId: 1, tourNombre: 'Paseo', fecha: '2030-06-15', horaSalida: '12:00:00',
  precioPorPasajero: 80.25, cuposDisponibles: 4, reservable: true, embarcacionId: 1,
  embarcacionNombre: 'Barco', estado: 'PROGRAMADA' } as SalidaProgramada;

describe('Pasajeros del checkout', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
      { provide: Tours, useValue: { listarDestacados: () => of([]), urlImagen: (s: string) => s } }
    ] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function iniciar() {
    const fixture = TestBed.createComponent(RecomendacionesComponent);
    http.expectOne(`${API_URL}/reservas/tarifas`).flush(tarifas);
    const c = fixture.componentInstance;
    c.tourSeleccionado.set({ id: 1, nombre: 'Paseo', descripcion: '', duracionMinutos: 60,
      precioBase: 80.25, activo: true, categoriaId: 1, categoria: null, imagenUrl: null,
      proximaSalida: salida, salidas: [salida], errorSalida: false });
    c.modalAbierto.set(true);
    c.seleccionarSalida(salida);
    return { fixture, c };
  }
  it('usa tres contadores, respeta cupos y conserva al menos un pasajero', () => {
    const { c, fixture } = iniciar();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="date"]')).toBeNull();
    c.cambiarCantidad('ADULTO', -1);
    expect(c.pasajeros.value).toBe(0);
    expect(c.puedeContinuarReserva()).toBe(false);
    c.cambiarCantidad('ADULTO', 1);
    c.cambiarCantidad('NINO', 1);
    c.cambiarCantidad('ADULTO_MAYOR', 1);
    expect(c.total()).toBe(200.63);
    c.cambiarCantidad('NINO', 1);
    c.cambiarCantidad('NINO', 1);
    expect(c.pasajeros.value).toBe(4);
    c.cambiarCantidad('NINO', -1);
    c.continuarReserva();
    const req = http.expectOne(`${API_URL}/reservas`);
    expect(req.request.body).toEqual({ salidaId: 3, ninos: 1, adultos: 1, adultosMayores: 1, precioEsperado: 200.63 });
    c.cambiarCantidad('ADULTO', 1);
    expect(c.pasajeros.value).toBe(3);
    req.flush({ id: 1, salidaId: 3, cuposDisponibles: 1, precioTotal: 200.63 });
    expect(c.pasoCheckout()).toBe('PAGO');
  });
});
