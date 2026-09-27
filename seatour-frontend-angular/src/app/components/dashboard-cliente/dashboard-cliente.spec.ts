import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { DashboardClienteComponent } from './dashboard-cliente';
import { ZONAS_MARITIMAS, ZONA_STORAGE_KEY } from './zonas-maritimas';

describe('Ocean Intelligence por zona', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    localStorage.removeItem(ZONA_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { http.verify(); localStorage.removeItem(ZONA_STORAGE_KEY); });
  function peticiones(indice = 0) {
    const zona = ZONAS_MARITIMAS[indice];
    const weather = http.expectOne(r => r.url === 'https://api.open-meteo.com/v1/forecast');
    const marine = http.expectOne(r => r.url === 'https://marine-api.open-meteo.com/v1/marine');
    for (const req of [weather, marine]) {
      expect(req.request.params.get('latitude')).toBe(String(zona.latitud));
      expect(req.request.params.get('longitude')).toBe(String(zona.longitud));
    }
    return { weather, marine };
  }
  it('consulta ambas APIs y actualiza las seis condiciones desde sus respuestas', () => {
    const fixture = TestBed.createComponent(DashboardClienteComponent);
    const { weather, marine } = peticiones();
    weather.flush({ current: { time: '2026-09-27T10:00', temperature_2m: 21, weather_code: 3, wind_speed_10m: 0, visibility: 12000 } });
    marine.flush({ current: { time: '2026-09-27T10:00', wave_height: 1.2, sea_surface_temperature: 19 } });
    const datos = fixture.componentInstance.condicionActual();
    expect(datos.temperatura).toBe('21 °C');
    expect(datos.estado).toBe('Nublado');
    expect(datos.metricas.map(m => m.valor)).toEqual(['1.2 m', '0 km/h', '12 km', '19 °C']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.floating-card select option').length).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Cielo despejado');
  });
  it('cambia desde el selector, cancela consultas previas y guarda la selección', () => {
    const fixture = TestBed.createComponent(DashboardClienteComponent);
    const anteriores = peticiones();
    fixture.detectChanges();
    const select: HTMLSelectElement = fixture.nativeElement.querySelector('.floating-card select');
    select.value = 'el-nuro';
    select.dispatchEvent(new Event('change'));
    expect(anteriores.weather.cancelled).toBe(true);
    expect(anteriores.marine.cancelled).toBe(true);
    expect(localStorage.getItem(ZONA_STORAGE_KEY)).toBe('el-nuro');
    const siguientes = peticiones(2);
    siguientes.weather.flush({ current: { temperature_2m: 25, weather_code: 0 } });
    siguientes.marine.flush({ current: {} });
    expect(fixture.componentInstance.condicionActual().ubicacion).toBe('El Ñuro');
    expect(fixture.componentInstance.condicionActual().temperatura).toBe('25 °C');
  });
  it('restaura la zona guardada y conserva datos parciales sin inventar mediciones', () => {
    localStorage.setItem(ZONA_STORAGE_KEY, 'cabo-blanco');
    const c = TestBed.createComponent(DashboardClienteComponent).componentInstance;
    const { weather, marine } = peticiones(3);
    weather.flush({ current: { temperature_2m: null, weather_code: 999, visibility: null } });
    marine.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(c.condicionActual().temperatura).toBe('No disponible');
    expect(c.condicionActual().estado).toBe('No disponible');
    expect(c.condicionActual().metricas.every(m => m.valor === 'No disponible')).toBe(true);
    expect(c.cargando()).toBe(false);
  });
  it('borra los datos de la zona previa mientras carga y soporta el fallo de Weather', () => {
    const c = TestBed.createComponent(DashboardClienteComponent).componentInstance;
    const iniciales = peticiones();
    iniciales.weather.flush({ current: { temperature_2m: 22 } });
    iniciales.marine.flush({ current: { wave_height: 1 } });
    c.cambiarZona('los-organos');
    expect(c.condicionActual().temperatura).toBe('No disponible');
    const siguientes = peticiones(1);
    siguientes.weather.flush({}, { status: 503, statusText: 'Unavailable' });
    siguientes.marine.flush({ current: { wave_height: 0, sea_surface_temperature: 20 } });
    expect(c.condicionActual().metricas[0].valor).toBe('0 m');
    expect(c.condicionActual().metricas[3].valor).toBe('20 °C');
    expect(c.condicionActual().temperatura).toBe('No disponible');
  });
});
