import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login';
import { Inicio } from './components/inicio/inicio';

export const routes: Routes = [
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
