import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Route, Router, RouterOutlet } from '@angular/router';
import { routes } from '../../app.routes';
import { AuthService } from '../../services/auth.service';
import { PrivateLayout } from '../layouts';
import { ClienteShell } from './cliente-shell';

@Component({ template: '<section class="hero">Dashboard</section>' })
class DashboardStub {}
@Component({ template: '<section>Mis reservas</section>' })
class ReservasStub {}
@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class TestApp {}

function findShell(items: Route[]): Route | undefined {
  for (const route of items) {
    if (route.component === ClienteShell) return route;
    const found = findShell(route.children ?? []);
    if (found) return found;
  }
  return undefined;
}

describe('ClienteShell', () => {
  it('conserva shell, imagen y navegación al cambiar el contenido en ambas direcciones', async () => {
    const shell = findShell(routes)!;
    expect(shell.children?.map(route => route.path)).toEqual(['dashboard', 'mis-reservas']);
    TestBed.configureTestingModule({
      imports: [TestApp],
      providers: [
        { provide: AuthService, useValue: { usuario: signal({ nombre: 'Ana', rol: 'CLIENTE' }) } },
        provideRouter([{
          path: 'app', component: PrivateLayout, children: [{
            ...shell,
            children: shell.children!.map(route => ({
              path: route.path,
              component: route.path === 'dashboard' ? DashboardStub : ReservasStub
            }))
          }]
        }])
      ]
    });
    const fixture = TestBed.createComponent(TestApp);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/app/mis-reservas');
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const layout = element.querySelector('app-cliente-shell');
    const background = element.querySelector('.cliente-hero');
    const nav = element.querySelector('app-reservas-nav');
    expect(layout).not.toBeNull();
    for (const path of ['dashboard', 'mis-reservas']) {
      await router.navigateByUrl(`/app/${path}`);
      await fixture.whenStable();
      expect(element.querySelector('app-cliente-shell')).toBe(layout);
      expect(element.querySelector('.cliente-hero')).toBe(background);
      expect(element.querySelector('app-reservas-nav')).toBe(nav);
      expect(element.querySelectorAll('app-reservas-nav')).toHaveLength(1);
      expect(element.querySelector('.hero') !== null).toBe(path === 'dashboard');
    }
  });
});
