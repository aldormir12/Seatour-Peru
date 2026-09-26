import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { API_URL, AuthService, LoginTrasRegistroError } from './auth.service';
import { authInterceptor } from '../interceptors/auth.interceptor';
import { authGuard } from '../guards/auth.guard';

export function tokenPrueba(exp = Date.now() / 1000 + 3600): string {
  return `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify({ exp })).replace(/=/g, '')}.firma`;
}
const usuario = { id: 1, nombre: 'Ana', correo: 'ana@example.com', rol: 'CLIENTE' as const };

describe('Autenticacion y sesion', () => {
  let auth: AuthService;
  let http: HttpTestingController;
  let client: HttpClient;
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([]),
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()] });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });
  afterEach(() => { http.verify(); auth.logout(); vi.useRealTimers(); });

  function login(token = tokenPrueba()) {
    auth.login(' ANA@example.com ', 'secreto').subscribe();
    const req = http.expectOne(`${API_URL}/auth/login`);
    expect(req.request.body.correo).toBe('ana@example.com');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ ...usuario, token });
    return token;
  }

  it('registra sin rol ni confirmacion y guarda JWT tras login automatico', () => {
    auth.registrar({ nombre: ' Ana ', apellido: ' Perez ', correo: 'ANA@example.com', password: 'secreto' }).subscribe();
    const req = http.expectOne(`${API_URL}/usuarios`);
    expect(req.request.body).toEqual({ nombre: 'Ana', apellido: 'Perez', correo: 'ana@example.com', password: 'secreto' });
    req.flush(usuario);
    const token = tokenPrueba();
    http.expectOne(`${API_URL}/auth/login`).flush({ ...usuario, token });
    expect(auth.usuario()).toEqual(usuario);
    expect(localStorage.getItem('seatour_token')).toBe(token);
    expect(auth.estaAutenticado()).toBe(true);
  });

  it('no inicia sesion si el correo esta duplicado', () => {
    const error = vi.fn();
    auth.registrar({ ...usuario, apellido: 'Perez', password: 'secreto' }).subscribe({ error });
    http.expectOne(`${API_URL}/usuarios`).flush({}, { status: 409, statusText: 'Conflict' });
    http.expectNone(`${API_URL}/auth/login`);
    expect(error.mock.calls[0][0].status).toBe(409);
  });

  it('distingue cuenta creada de fallo de login posterior', () => {
    const error = vi.fn();
    auth.registrar({ ...usuario, apellido: 'Perez', password: 'secreto' }).subscribe({ error });
    http.expectOne(`${API_URL}/usuarios`).flush(usuario);
    http.expectOne(`${API_URL}/auth/login`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(error.mock.calls[0][0]).toBeInstanceOf(LoginTrasRegistroError);
  });

  it('restaura usando el usuario verificado por backend e ignora el perfil local alterado', () => {
    const token = tokenPrueba();
    localStorage.setItem('seatour_token', token);
    localStorage.setItem('seatour_usuario', '{"rol":"ADMIN"}');
    auth.restaurarSesion().subscribe();
    const req = http.expectOne(`${API_URL}/auth/me`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush(usuario);
    expect(auth.usuario()).toEqual(usuario);
    expect(auth.tieneRol('ADMIN')).toBe(false);
  });

  it.each(['basura', 'a.b.c', tokenPrueba(Date.now() / 1000 - 10)])('descarta token invalido o expirado: %s', token => {
    localStorage.setItem('seatour_token', token);
    auth.restaurarSesion().subscribe();
    http.expectNone(`${API_URL}/auth/me`);
    expect(auth.estaAutenticado()).toBe(false);
    expect(localStorage.getItem('seatour_token')).toBeNull();
  });

  it('caduca la sesion abierta y permite logout', () => {
    vi.useFakeTimers();
    login(tokenPrueba(Date.now() / 1000 + 2));
    vi.advanceTimersByTime(2100);
    expect(auth.usuario()).toBeNull();
    login();
    auth.logout();
    expect(localStorage.getItem('seatour_usuario')).toBeNull();
    expect(auth.obtenerToken()).toBeNull();
  });

  it('envia JWT solo a la API y limpia sesion con 401 pero no con 403', () => {
    const token = login();
    client.get('https://externo.example/datos').subscribe();
    const externo = http.expectOne('https://externo.example/datos');
    expect(externo.request.headers.has('Authorization')).toBe(false);
    externo.flush({});
    client.get(`${API_URL}/usuarios`).subscribe({ error: () => {} });
    const prohibido = http.expectOne(`${API_URL}/usuarios`);
    expect(prohibido.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    prohibido.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(auth.estaAutenticado()).toBe(true);
    client.get(`${API_URL}/auth/me`).subscribe({ error: () => {} });
    http.expectOne(`${API_URL}/auth/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.usuario()).toBeNull();
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/login'], { queryParams: { sesion: 'expirada' } });
  });

  it('guard bloquea anonimos, conserva destino y permite sesion valida', () => {
    const ejecutar = () => TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot,
      { url: '/privado' } as RouterStateSnapshot));
    expect(ejecutar().toString()).toBe('/login?returnUrl=%2Fprivado');
    login();
    expect(ejecutar()).toBe(true);
  });
});
