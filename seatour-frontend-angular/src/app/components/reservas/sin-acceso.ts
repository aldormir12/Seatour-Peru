import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReservasNav } from './reservas-nav';

@Component({
  selector: 'app-sin-acceso',
  standalone: true,
  imports: [
    RouterLink,
    ReservasNav
  ],
  styleUrl: './sin-acceso.css',
  template: `
    <app-reservas-nav></app-reservas-nav>

    <main class="access-page" aria-labelledby="access-title">
      <section class="access-card">
        <span class="access-brand">SEATOUR · PERÚ</span>
        <div class="access-icon" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path d="M24 5 39 11v12c0 10-7 16-15 20C16 39 9 33 9 23V11L24 5Z" />
            <rect x="17" y="21" width="14" height="11" rx="3" />
            <path d="M20 21v-4a4 4 0 0 1 8 0v4M24 26v2" />
          </svg>
        </div>
        <h1 id="access-title">Acceso restringido</h1>
        <p class="access-description">
          Tu cuenta no tiene permisos para acceder a esta página.
          Puedes volver a tu panel y continuar explorando SeaTour.
        </p>
        <a class="panel-link" routerLink="/app">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m10 6-6 6 6 6M4 12h16" />
          </svg>
          Volver a mi panel
        </a>
        <p class="access-note">Tu próxima experiencia te espera.</p>
      </section>
    </main>
  `
})
export class SinAccesoComponent {}
