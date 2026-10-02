import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from './app.routes';
import { AuthService } from './services/auth.service';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the home at / and replaces it with only login at /login', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/');
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Explora el norte');
    expect(compiled.querySelector('.hero')?.nextElementSibling).toBeNull();
    expect(compiled.querySelector('app-login')).toBeNull();

    await router.navigateByUrl('/login');
    await fixture.whenStable();
    expect(compiled.querySelector('app-login form')).not.toBeNull();
    expect(compiled.querySelector('.hero')).toBeNull();
    expect(compiled.querySelector('.navbar')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('http://localhost:8080/api/tours');
  });

  it('renders a direct navigation to /login without creating the home', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/login');
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-login form')).not.toBeNull();
    expect(compiled.querySelector('app-inicio')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone('http://localhost:8080/api/tours');
  });

  it('renders registro directly and updates the home session actions after login and logout', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    const http = TestBed.inject(HttpTestingController);
    const auth = TestBed.inject(AuthService);
    auth.logout();
    fixture.detectChanges();
    await router.navigateByUrl('/registro');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-registro input').length).toBe(5);
    await router.navigateByUrl('/');
    fixture.detectChanges();
    http.match('http://localhost:8080/api/tours').forEach(req => req.flush([]));
    expect(fixture.nativeElement.querySelector('.nav-actions').textContent).toContain('Registrarse');
    auth.login('ana@example.com', 'secreto').subscribe();
    const token = `e30.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })).replace(/=/g, '')}.firma`;
    http.expectOne('http://localhost:8080/api/auth/login').flush({
      id: 1, nombre: 'Ana', correo: 'ana@example.com', rol: 'CLIENTE', token
    });
    fixture.detectChanges();
    const nav = fixture.nativeElement.querySelector('.nav-actions') as HTMLElement;
    expect(nav.textContent).toContain('Ana');
    expect(nav.textContent).not.toContain('Registrarse');
    (nav.querySelector('button.session-action') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(nav.textContent).toContain('Iniciar sesión');
    expect(auth.estaAutenticado()).toBe(false);
  });
});
