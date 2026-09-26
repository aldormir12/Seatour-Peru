import { RegistroComponent } from './components/registro/registro';
import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Inicio } from './components/inicio/inicio';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: 'salidas', loadComponent: () => import('./components/reservas/salidas').then(m => m.SalidasComponent) },
  { path: 'reservar/:salidaId', canActivate: [authGuard, roleGuard], data: { roles: ['CLIENTE'] },
    loadComponent: () => import('./components/reservas/reservar').then(m => m.ReservarComponent) },
  { path: 'mis-reservas', canActivate: [authGuard, roleGuard], data: { roles: ['CLIENTE'] },
    loadComponent: () => import('./components/reservas/reservas-lista').then(m => m.ReservasListaComponent) },
  { path: 'gestion/reservas', canActivate: [authGuard, roleGuard], data: { roles: ['OPERADOR', 'ADMIN'], gestion: true },
    loadComponent: () => import('./components/reservas/reservas-lista').then(m => m.ReservasListaComponent) },
  { path: 'reservas/:id', canActivate: [authGuard, roleGuard], data: { roles: ['CLIENTE', 'OPERADOR', 'ADMIN'] },
    loadComponent: () => import('./components/reservas/reserva-detalle').then(m => m.ReservaDetalleComponent) },
  { path: 'sin-acceso', loadComponent: () => import('./components/reservas/sin-acceso').then(m => m.SinAccesoComponent) },
  { path: 'registro', component: RegistroComponent },
  {
    path: '',
    pathMatch: 'full',
    component: Inicio
  },
  {
    path: 'login',
    component: LoginComponent
  }
];
