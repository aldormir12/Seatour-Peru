import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { routes } from './app.routes';

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
    TestBed.inject(HttpTestingController).match('http://localhost:8080/api/tours')
      .forEach(request => request.flush([]));
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Explora el norte');
    expect(compiled.querySelector('.hero')?.nextElementSibling?.tagName)
      .toBe('APP-RUTAS-INTERACTIVAS');
    expect(compiled.querySelector('app-login')).toBeNull();

    await router.navigateByUrl('/login');
    await fixture.whenStable();
    expect(compiled.querySelector('app-login form')).not.toBeNull();
    expect(compiled.querySelector('.hero')).toBeNull();
    expect(compiled.querySelector('.navbar')).toBeNull();
    expect(compiled.querySelector('app-rutas-interactivas')).toBeNull();
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
});
