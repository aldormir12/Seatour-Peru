import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { PerfilCliente } from '../perfil-cliente/perfil-cliente';
import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { AuthService } from '../../services/auth.service';
import {
  inicioPorRol,
  reservasPorRol
} from '../../navigation';

interface NavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-reservas-nav',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    PerfilCliente
  ],

  template: `
    <nav
      class="nav-shell"
      aria-label="Navegación principal"
    >

      <div class="nav-left">

        <!-- MARCA -->
        <a
          class="brand"
          routerLink="/"
        >

          <span
            class="brand-icon"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24">
              <path
                d="M4 13c2.2-2 4.5-2 6.7 0 2.2 2 4.5 2 6.6 0"
              />

              <path
                d="M5 9c1.8-1.5 3.8-1.5 5.6 0 1.8 1.5 3.8 1.5 5.6 0"
              />
            </svg>
          </span>


          <span class="brand-text">

            <strong>
              SeaTour
            </strong>

            <small>
              PERÚ
            </small>

          </span>

        </a>


        <!-- NAVEGACIÓN -->
        <div class="nav-links">

          @for (
            link of enlaces();
            track link.route
          ) {

            <a
              [routerLink]="link.route"
              routerLinkActive="active-link"
              [routerLinkActiveOptions]="{
                exact:
                  link.route === '/app/dashboard'
              }"
            >
              {{ link.label }}
            </a>

          }

        </div>

      </div>


      <!-- LADO DERECHO -->
      <div class="nav-right">

        @if (
          auth.usuario();
          as usuario
        ) {

          <!-- NOTIFICACIONES -->
          <button
            class="notification-btn"
            type="button"
            aria-label="Notificaciones"
          >

            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 4a4 4 0 0 0-4 4v2.1c0 .7-.2 1.3-.6 1.9L6 14.2V16h12v-1.8L16.6 12c-.4-.6-.6-1.2-.6-1.9V8a4 4 0 0 0-4-4Z"
              />

              <path
                d="M10 18a2 2 0 0 0 4 0"
              />
            </svg>

            <span
              class="notification-dot"
            ></span>

          </button>


          <div class="user-actions">

            <!-- PERFIL -->
            <button
              class="user-chip"
              type="button"
              (click)="abrirPerfil()"
              [disabled]="usuario.rol !== 'CLIENTE'"
              [attr.aria-expanded]="perfilAbierto()"
              aria-label="Ver mi perfil"
            >

              <span class="avatar">
                {{
                  iniciales(
                    usuario.nombre
                  )
                }}
              </span>


              <span class="user-copy">

                <small>
                  Hola,
                </small>

                <strong>
                  {{ usuario.nombre }}
                </strong>

              </span>


              <svg
                class="profile-arrow"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="m9 6 6 6-6 6"
                />
              </svg>

            </button>


            <!-- CERRAR SESIÓN -->
            <button
              class="logout-btn"
              type="button"
              (click)="salir()"
              aria-label="Cerrar sesión"
            >

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  d="M9 5H5v14h4"
                />

                <path
                  d="M13 8l4 4-4 4"
                />

                <path
                  d="M8 12h9"
                />
              </svg>

            </button>

          </div>

        } @else {

          <div class="guest-actions">

            <a
              class="ghost-link"
              routerLink="/login"
            >
              Iniciar sesión
            </a>

            <a
              class="primary-link"
              routerLink="/registro"
            >
              Registrarse
            </a>

          </div>

        }

      </div>

    </nav>
<dialog
  #panelPerfil
  class="profile-dialog"
  aria-label="Mi perfil"
  (click)="$event.target === panelPerfil && cerrarPerfil()"
  (cancel)="$event.preventDefault(); cerrarPerfil()"
  (close)="perfilAbierto.set(false)"
>
  <aside class="profile-panel">

    @if (
      auth.usuario();
      as usuario
    ) {

      <header class="profile-panel-header">

        <div class="profile-identity">

          <div class="profile-avatar-large">
            {{
              iniciales(
                usuario.nombre
              )
            }}
          </div>

          <div class="profile-identity-copy">

            <span class="profile-eyebrow">
              Mi perfil
            </span>

            <strong>
              {{ usuario.nombre }}
            </strong>

            <small>
              {{ usuario.correo }}
            </small>

          </div>

        </div>


        <button
          type="button"
          class="profile-close"
          (click)="cerrarPerfil()"
          aria-label="Cerrar perfil"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6 6 18"></path>
          </svg>
        </button>

      </header>

    }


    <div class="profile-panel-body">

      @if (
        perfilAbierto() &&
        auth.usuario()?.rol === 'CLIENTE'
      ) {

        <app-perfil-cliente />

      }

    </div>

  </aside>
</dialog>
  `,
styles: [`

  .profile-dialog {
    position: fixed;
    inset: 0 0 0 auto;

    width: min(100%, 500px);
    max-width: 100vw;

    height: 100dvh;
    max-height: 100dvh;

    margin: 0;
    padding: 0;

    border: 0;

    background: transparent;
    color: #102d41;

    overflow: hidden;

    box-shadow:
      -30px 0 80px
      rgba(3, 15, 24, 0.26);
  }


  .profile-dialog::backdrop {
    background:
      rgba(3, 14, 22, 0.52);

    backdrop-filter:
      blur(4px);

    -webkit-backdrop-filter:
      blur(4px);
  }


  .profile-panel {
    display: flex;
    flex-direction: column;

    width: 100%;
    height: 100%;

    background: #f5f7f8;
  }


  .profile-panel-header {
    position: relative;

    display: flex;
    align-items: center;
    justify-content: space-between;

    gap: 18px;

    flex-shrink: 0;

    padding:
      22px
      22px
      20px;

    color: white;

    background:
      linear-gradient(
        135deg,
        #071923 0%,
        #0d2e3b 58%,
        #105b5c 130%
      );

    border-bottom:
      1px solid
      rgba(255, 255, 255, 0.08);
  }


  .profile-panel-header::after {
    content: '';

    position: absolute;

    left: 22px;
    right: 22px;
    bottom: 0;

    height: 1px;

    background:
      linear-gradient(
        90deg,
        rgba(78, 220, 210, 0.45),
        transparent
      );
  }


  .profile-identity {
    display: flex;
    align-items: center;

    gap: 14px;

    min-width: 0;
  }


  .profile-avatar-large {
    width: 46px;
    height: 46px;

    display: grid;
    place-items: center;

    flex-shrink: 0;

    border-radius: 15px;

    color: #083342;

    background:
      linear-gradient(
        145deg,
        #dffff9,
        #a8e9e2
      );

    border:
      1px solid
      rgba(255, 255, 255, 0.65);

    font-size: 13px;
    font-weight: 800;

    box-shadow:
      0 8px 25px
      rgba(0, 0, 0, 0.12);
  }


  .profile-identity-copy {
    display: flex;
    flex-direction: column;

    min-width: 0;
  }


  .profile-eyebrow {
    margin-bottom: 3px;

    color: #74ddd3;

    font-size: 9px;
    font-weight: 800;

    letter-spacing: 0.15em;

    text-transform: uppercase;
  }


  .profile-identity-copy strong {
    overflow: hidden;

    color: white;

    font-size: 17px;
    font-weight: 700;

    line-height: 1.25;

    text-overflow: ellipsis;
    white-space: nowrap;
  }


  .profile-identity-copy small {
    margin-top: 3px;

    overflow: hidden;

    color:
      rgba(255, 255, 255, 0.58);

    font-size: 11px;

    text-overflow: ellipsis;
    white-space: nowrap;
  }


  .profile-close {
    width: 38px;
    height: 38px;

    display: grid;
    place-items: center;

    flex-shrink: 0;

    padding: 0;

    color:
      rgba(255, 255, 255, 0.76);

    background:
      rgba(255, 255, 255, 0.08);

    border:
      1px solid
      rgba(255, 255, 255, 0.12);

    border-radius: 12px;

    cursor: pointer;

    transition:
      background 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }


  .profile-close:hover {
    color: white;

    background:
      rgba(255, 255, 255, 0.14);

    transform: rotate(4deg);
  }


  .profile-close svg {
    width: 17px;
    height: 17px;

    fill: none;
    stroke: currentColor;

    stroke-width: 1.8;

    stroke-linecap: round;
  }


  .profile-panel-body {
    flex: 1;

    min-height: 0;

    overflow-y: auto;

    scrollbar-width: thin;
    scrollbar-color: #c9d4d8 transparent;
  }


  .profile-panel-body::-webkit-scrollbar {
    width: 6px;
  }


  .profile-panel-body::-webkit-scrollbar-thumb {
    background: #c9d4d8;

    border-radius: 999px;
  }


  @media (max-width: 560px) {

    .profile-dialog {
      width: calc(100% - 18px);
    }


    .profile-panel-header {
      padding: 18px;
    }

  }


  :host {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 12;
    display: block;
    font-family: 'DM Sans', sans-serif;
  }

    .nav-shell {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;

      padding:
        20px
        28px;

      color: white;
      background: transparent;
      border-bottom: 0;
    }


    .nav-left {
      display: flex;
      align-items: center;
      gap: 28px;
      min-width: 0;
    }


    /* ====================================================== */
    /* MARCA */
    /* ====================================================== */

    .brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;

      color: white;
      text-decoration: none;

      flex-shrink: 0;
    }


    .brand-icon {
      width: 36px;
      height: 36px;

      display: grid;
      place-items: center;

      border-radius: 999px;

      background:
        rgba(
          17,
          155,
          227,
          0.18
        );

      border:
        1px solid
        rgba(
          128,
          220,
          255,
          0.4
        );

      backdrop-filter:
        blur(8px);
    }


    .brand-icon svg {
      width: 18px;
      height: 18px;

      fill: none;

      stroke:
        #70d5ff;

      stroke-width: 2;

      stroke-linecap:
        round;

      stroke-linejoin:
        round;
    }


    .brand-text {
      display: flex;
      flex-direction: column;

      line-height: 1;
    }


    .brand-text strong {
      font-size: 17px;
      font-weight: 800;

      letter-spacing:
        -0.4px;
    }


    .brand-text small {
      margin-top: 3px;

      font-size: 9px;
      font-weight: 600;

      letter-spacing:
        3px;

      color:
        rgba(
          255,
          255,
          255,
          0.82
        );
    }


    /* ====================================================== */
    /* LINKS */
    /* ====================================================== */

    .nav-links {
      display: flex;
      align-items: center;

      gap: 24px;

      flex-wrap: wrap;
    }


    .nav-links a {
      position: relative;

      color:
        rgba(
          255,
          255,
          255,
          0.82
        );

      text-decoration: none;

      font-size: 13px;
      font-weight: 600;

      padding:
        8px
        0;

      transition:
        color 160ms ease,
        opacity 160ms ease;
    }


    .nav-links a:hover {
      color: white;
    }


    /*
     * Ruta activa.
     * Muy sutil para conservar
     * el lenguaje visual del dashboard.
     */
    .nav-links a.active-link {
      color: white;
    }


    .nav-links a.active-link::after {
      content: '';

      position: absolute;

      left: 50%;
      bottom: 1px;

      width: 100%;
      height: 2px;

      transform:
        translateX(-50%);

      border-radius:
        999px;

      background:
        rgba(
          255,
          255,
          255,
          0.95
        );
    }


    /* ====================================================== */
    /* DERECHA */
    /* ====================================================== */

    .nav-right {
      display: flex;
      align-items: center;

      gap: 12px;

      flex-shrink: 0;
    }


    /* ====================================================== */
    /* NOTIFICACIONES */
    /* ====================================================== */

    .notification-btn {
      position: relative;

      width: 42px;
      height: 42px;

      display: grid;
      place-items: center;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.28
        );

      border-radius:
        999px;

      background:
        rgba(
          31,
          43,
          59,
          0.24
        );

      backdrop-filter:
        blur(10px);

      -webkit-backdrop-filter:
        blur(10px);

      cursor: pointer;

      padding: 0;
    }


    .notification-btn svg {
      width: 18px;
      height: 18px;

      fill: none;

      stroke: white;

      stroke-width: 1.9;

      stroke-linecap:
        round;

      stroke-linejoin:
        round;

      opacity: 0.95;
    }


    .notification-dot {
      position: absolute;

      top: 10px;
      right: 11px;

      width: 7px;
      height: 7px;

      border-radius:
        999px;

      background:
        #ffffff;

      box-shadow:
        0 0 0 3px
        rgba(
          255,
          255,
          255,
          0.12
        );
    }


    /* ====================================================== */
    /* USUARIO */
    /* ====================================================== */

    .user-actions {
      display: flex;
      align-items: center;

      gap: 8px;
    }


    .user-chip {
      display: inline-flex;
      align-items: center;

      gap: 10px;

      min-height: 44px;

      padding:
        5px
        10px
        5px
        6px;

      color: white;

      text-decoration: none;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.18
        );

      border-radius:
        999px;

      background:
        rgba(
          31,
          43,
          59,
          0.42
        );

      backdrop-filter:
        blur(10px);

      -webkit-backdrop-filter:
        blur(10px);

      transition:
        background 160ms ease,
        border-color 160ms ease;
    }


    .user-chip:hover {
      background:
        rgba(
          31,
          43,
          59,
          0.58
        );

      border-color:
        rgba(
          255,
          255,
          255,
          0.28
        );
    }


    .avatar {
      width: 32px;
      height: 32px;

      display: grid;
      place-items: center;

      border-radius: 50%;

      background:
        #e7f8ff;

      color:
        #063148;

      font-size: 11px;
      font-weight: 800;
    }


    .user-copy {
      display: flex;
      align-items: baseline;

      gap: 4px;

      white-space: nowrap;
    }


    .user-copy small {
      color:
        rgba(
          255,
          255,
          255,
          0.74
        );

      font-size: 11px;
    }


    .user-copy strong {
      color: white;

      font-size: 12px;
      font-weight: 700;
    }


    .profile-arrow {
      width: 14px;
      height: 14px;

      fill: none;

      stroke: white;

      stroke-width: 2;

      stroke-linecap:
        round;

      stroke-linejoin:
        round;

      opacity: 0.75;
    }


    /* ====================================================== */
    /* LOGOUT */
    /* ====================================================== */

    .logout-btn {
      width: 38px;
      height: 38px;

      display: grid;
      place-items: center;

      padding: 0;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.16
        );

      border-radius:
        50%;

      color:
        rgba(
          255,
          255,
          255,
          0.82
        );

      background:
        rgba(
          31,
          43,
          59,
          0.3
        );

      cursor: pointer;

      transition:
        background 160ms ease,
        color 160ms ease;
    }


    .logout-btn:hover {
      color: white;

      background:
        rgba(
          180,
          40,
          40,
          0.38
        );
    }


    .logout-btn svg {
      width: 16px;
      height: 16px;

      fill: none;

      stroke:
        currentColor;

      stroke-width: 1.8;

      stroke-linecap:
        round;

      stroke-linejoin:
        round;
    }


    /* ====================================================== */
    /* INVITADO */
    /* ====================================================== */

    .guest-actions {
      display: flex;
      align-items: center;

      gap: 10px;
    }


    .ghost-link,
    .primary-link {
      text-decoration: none;

      font-size: 13px;
      font-weight: 700;

      border-radius:
        999px;

      padding:
        11px
        16px;
    }


    .ghost-link {
      color: white;

      border:
        1px solid
        rgba(
          255,
          255,
          255,
          0.3
        );

      background:
        rgba(
          31,
          43,
          59,
          0.24
        );
    }


    .primary-link {
      color: white;

      background:
        #159fe1;
    }


    /* ====================================================== */
    /* RESPONSIVE */
    /* ====================================================== */

    @media (
      max-width: 980px
    ) {

      .nav-shell {
        flex-direction:
          column;

        align-items:
          flex-start;

        padding:
          18px
          18px;
      }


      .nav-left {
        width: 100%;

        flex-direction:
          column;

        align-items:
          flex-start;

        gap: 16px;
      }


      .nav-links {
        gap: 14px;
      }


      .nav-right {
        width: 100%;

        justify-content:
          flex-end;
      }

    }

  `]
})
export class ReservasNav {
  readonly perfilAbierto = signal(false);
  private readonly panelPerfil = viewChild<ElementRef<HTMLDialogElement>>('panelPerfil');

  abrirPerfil(): void {
    if (this.auth.usuario()?.rol !== 'CLIENTE') return;
    this.perfilAbierto.set(true);
    this.panelPerfil()?.nativeElement.showModal();
  }

  cerrarPerfil(): void {
    this.panelPerfil()?.nativeElement.close();
    this.perfilAbierto.set(false);
  }

  readonly auth =
    inject(AuthService);

  private readonly router =
    inject(Router);


  readonly enlaces =
    computed<NavLink[]>(() => {

      const usuario =
        this.auth.usuario();


      if (!usuario) {

        return [
          {
            label: 'Inicio',
            route: '/'
          },
          {
            label: 'Tours',
            route: '/app/tours'
          },
          {
            label: 'Mis reservas',
            route: '/login'
          }
        ];
      }


      if (
        usuario.rol === 'CLIENTE'
      ) {

        return [
          {
            label: 'Inicio',
            route: '/app/dashboard'
          },
          {
            label: 'Tours',
            route: '/app/tours'
          },
          {
            label: 'Mis reservas',
            route: '/app/mis-reservas'
          },
          {
            label: 'SeaTour Live',
            route: '/app/live'
          }
        ];
      }


      return [
        {
          label: 'Inicio',
          route:
            inicioPorRol(
              usuario.rol
            )
        },
        {
          label: 'Salidas',
          route:
            `${inicioPorRol(
              usuario.rol
            )}/salidas`
        },
        {
          label: 'Reservas',
          route:
            reservasPorRol(
              usuario.rol
            )
        },
        {
          label: 'Embarcaciones',
          route:
            `${inicioPorRol(
              usuario.rol
            )}/embarcaciones`
        }
      ];

    });


  iniciales(
    nombre: string
  ): string {

    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        parte =>
          parte[0]?.toUpperCase()
          ?? ''
      )
      .join('');
  }


  async salir(): Promise<void> {

    if (
      await this.router
        .navigateByUrl('/')
    ) {

      this.auth.logout();
    }
  }
}
