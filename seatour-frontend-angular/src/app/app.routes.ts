import { inject } from '@angular/core';
import { RedirectFunction, Router, Routes } from '@angular/router';
import { RegistroComponent } from './components/registro/registro';
import { LoginComponent } from './components/login/login';
import { Inicio } from './components/inicio/inicio';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { AuthService } from './services/auth.service';
import { inicioPorRol, reservasPorRol } from './navigation';
import { PrivateLayout, PublicLayout, RoleLayout } from './layouts/layouts';
const area = () => import('./components/area/area').then(m => m.AreaComponent);
const salidas = () => import('./components/reservas/salidas').then(m => m.SalidasComponent);
const reservas = () => import('./components/reservas/reservas-lista').then(m => m.ReservasListaComponent);
const detalle = () => import('./components/reservas/reserva-detalle').then(m => m.ReservaDetalleComponent);
const inicio: RedirectFunction = () => inicioPorRol(inject(AuthService).usuario()?.rol);
function antigua(destino: string): RedirectFunction {
  return ({ params, queryParams, fragment }) => inject(Router).createUrlTree([
    destino.replace(':salidaId', params['salidaId'] ?? '')
  ], { queryParams, fragment: fragment ?? undefined });
}
const reservasAnteriores: RedirectFunction = ({ params, queryParams }) => {
  const base = reservasPorRol(inject(AuthService).usuario()?.rol ?? 'CLIENTE');
  const query = new URLSearchParams(queryParams).toString();
  return `${base}${params['id'] ? '/' + params['id'] : ''}${query ? '?' + query : ''}`;
};
function gestion(admin: boolean): Routes {
  return [
    { path: '', pathMatch: 'full', loadComponent: area, data: { titulo: admin ? 'Administración' : 'Operador', panel: true } },
    { path: 'salidas', loadComponent: salidas },
    { path: 'reservas', loadComponent: reservas, data: { gestion: true } },
    { path: 'reservas/:id', loadComponent: detalle },
    ...(admin ? ['usuarios', 'tours', 'categorias', 'embarcaciones'] : ['embarcaciones']).map(path => ({
      path, loadComponent: area, data: { titulo: path === 'categorias' ? 'Categorías' : path.charAt(0).toUpperCase() + path.slice(1) }
    }))
  ];
}
export const routes: Routes = [
  { path: '', component: PublicLayout, children: [
    { path: '', pathMatch: 'full', component: Inicio },
    { path: 'login', component: LoginComponent },
    { path: 'registro', component: RegistroComponent },
    { path: 'sin-acceso', loadComponent: () => import('./components/reservas/sin-acceso').then(m => m.SinAccesoComponent) }
  ] },
  { path: 'app', component: PrivateLayout, canActivate: [authGuard], canActivateChild: [authGuard], children: [
    { path: '', pathMatch: 'full', redirectTo: inicio },
    { path: 'operador', component: RoleLayout, canActivate: [roleGuard], canActivateChild: [roleGuard],
      data: { roles: ['OPERADOR'] }, children: gestion(false) },
    { path: 'admin', component: RoleLayout, canActivate: [roleGuard], canActivateChild: [roleGuard],
      data: { roles: ['ADMIN'] }, children: gestion(true) },
    { path: '', component: RoleLayout, canActivate: [roleGuard], canActivateChild: [roleGuard],
      data: { roles: ['CLIENTE'] }, children: [
        { path: 'dashboard', loadComponent: area, data: { titulo: 'Mi panel', panel: true } },
        { path: 'tours', loadComponent: salidas },
        { path: 'rutas', loadComponent: () => import('./components/rutas-interactivas/rutas-interactivas').then(m => m.RutasInteractivas) },
        { path: 'mis-reservas', loadComponent: reservas },
        { path: 'mis-reservas/:id', loadComponent: detalle },
        { path: 'reservar/:salidaId', loadComponent: () => import('./components/reservas/reservar').then(m => m.ReservarComponent) },
        { path: 'perfil', loadComponent: area, data: { titulo: 'Mi perfil', perfil: true } }
      ] }
  ] },
  { path: 'salidas', redirectTo: antigua('/app/tours') },
  { path: 'reservar/:salidaId', redirectTo: antigua('/app/reservar/:salidaId') },
  { path: 'mis-reservas', redirectTo: antigua('/app/mis-reservas') },
  { path: 'gestion/reservas', redirectTo: reservasAnteriores },
  { path: 'reservas/:id', redirectTo: reservasAnteriores },
  { path: '**', redirectTo: '/' }
];
