import {
  Component,
  inject
} from '@angular/core';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  AuthService
} from '../../services/auth.service';

import {
  inicioPorRol,
  reservasPorRol
} from '../../navigation';

import {
  DashboardClienteComponent
} from '../dashboard-cliente/dashboard-cliente';

@Component({
  selector: 'app-area',

  imports: [
    RouterLink,
    DashboardClienteComponent
  ],

  styleUrl:
    '../reservas/reservas.css',

  template: `
    @if (cliente && panel) {

      <app-dashboard-cliente />

    } @else {

      <main>

        <h1>
          {{ titulo }}
        </h1>

        @if (perfil) {

          <dl>

            <dt>
              Nombre
            </dt>

            <dd>
              {{ auth.usuario()?.nombre }}
            </dd>

            <dt>
              Correo
            </dt>

            <dd>
              {{ auth.usuario()?.correo }}
            </dd>

            <dt>
              Rol
            </dt>

            <dd>
              {{ auth.usuario()?.rol }}
            </dd>

          </dl>

        } @else if (panel) {

          <p>
            Bienvenido,
            {{ auth.usuario()?.nombre }}.
          </p>

          <div class="actions">

            <a
              class="action"
              [routerLink]="salidas"
            >
              Ver salidas
            </a>

            @if (auth.usuario()?.rol !== 'ADMIN') {
            <a
              class="action"
              [routerLink]="reservas"
            >
              Gestionar reservas
            </a>
            }

          </div>

        } @else {

          <p>
            Esta sección todavía
            no tiene una pantalla
            de gestión implementada.
          </p>

        }

      </main>

    }
  `
})
export class AreaComponent {

  readonly auth =
    inject(AuthService);

  private readonly data =
    inject(ActivatedRoute)
      .snapshot
      .data;

  readonly titulo =
    this.data['titulo'];

  readonly perfil =
    this.data['perfil'];

  readonly panel =
    this.data['panel'];

  readonly cliente =
    this.auth.usuario()?.rol
      === 'CLIENTE';

  readonly salidas =
    this.cliente
      ? '/app/tours'
      : `${inicioPorRol(
          this.auth.usuario()?.rol
        )}/salidas`;

  readonly reservas =
    reservasPorRol(
      this.auth.usuario()?.rol
    );
}