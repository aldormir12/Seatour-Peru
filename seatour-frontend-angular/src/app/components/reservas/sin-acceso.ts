import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReservasNav } from './reservas-nav';
@Component({
  selector: 'app-sin-acceso', imports: [RouterLink, ReservasNav], styleUrl: './reservas.css',
  template: `<app-reservas-nav /><main><h1>Acceso no permitido</h1><p>Tu cuenta no tiene el rol necesario para esta página.</p><a routerLink="/">Volver al inicio</a></main>`
})
export class SinAccesoComponent {}
