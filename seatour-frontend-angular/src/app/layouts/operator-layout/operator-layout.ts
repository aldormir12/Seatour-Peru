import { Component, inject } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-operator-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  template: `
    <div class="operator-shell">

      <!-- SIDEBAR -->
      <aside class="sidebar">

        <!-- Marca -->
        <div class="sidebar-top">

          <a
            routerLink="/app/operador"
            class="brand"
          >
            <span
              class="brand-icon"
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 32 32"
                fill="none"
              >
                <path
                  d="M5 19c3-2.8 6-2.8 9 0s6 2.8 9 0"
                />

                <path
                  d="M7 14c2.5-2.1 5.2-2.1 7.7 0 2.5 2.1 5.2 2.1 7.7 0"
                />

                <path
                  d="M10 10 16 4l6 6"
                />
              </svg>
            </span>

            <span class="brand-copy">
              <strong>SeaTour</strong>
              <small>OPERADOR</small>
            </span>
          </a>


          <!-- Navegación -->
          <nav
            class="nav"
            aria-label="Navegación del operador"
          >

            <a
              routerLink="/app/operador"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: true }"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m3 11 9-8 9 8"
                />

                <path
                  d="M5 10v10h14V10"
                />

                <path
                  d="M9 20v-6h6v6"
                />
              </svg>

              <span>Hoy</span>
            </a>


            <a
              routerLink="/app/operador/mis-salidas"
              routerLinkActive="active"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="4"
                  y="5"
                  width="16"
                  height="15"
                  rx="2"
                />

                <path
                  d="M8 3v4M16 3v4M4 10h16"
                />
              </svg>

              <span>Mis salidas</span>
            </a>

          </nav>

        </div>


        <!-- Usuario -->
        @if (auth.usuario(); as usuario) {

          <div class="sidebar-bottom">

            <div class="user">

              <span class="avatar">
                {{ iniciales(usuario.nombre) }}
              </span>

              <div class="user-copy">
                <strong>
                  {{ usuario.nombre }}
                </strong>

                <small>
                  Operador
                </small>
              </div>

            </div>


            <button
              type="button"
              class="logout"
              (click)="salir()"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M9 5H5v14h4" />
                <path d="m13 8 4 4-4 4" />
                <path d="M8 12h9" />
              </svg>

              <span>
                Cerrar sesión
              </span>
            </button>

          </div>

        }

      </aside>


      <!-- CONTENIDO -->
      <main class="content">
        <router-outlet />
      </main>

    </div>
  `,

  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      font-family: 'DM Sans', sans-serif;
      color: #13233f;
      background: #f4f7fb;
    }


    * {
      box-sizing: border-box;
    }


    .operator-shell {
      display: grid;
      grid-template-columns: 184px minmax(0, 1fr);
      min-height: 100vh;
      background: #f4f7fb;
    }


    /* ==============================
       SIDEBAR
       ============================== */

    .sidebar {
      position: sticky;
      top: 0;

      display: flex;
      flex-direction: column;
      justify-content: space-between;

      width: 184px;
      height: 100vh;

      padding: 22px 12px 18px;

      color: white;

      background:
        linear-gradient(
          180deg,
          #073555 0%,
          #062e4b 52%,
          #052944 100%
        );

      box-shadow:
        8px 0 28px rgba(15, 37, 61, 0.08);

      overflow: hidden;
      z-index: 20;
    }


    .sidebar-top {
      min-width: 0;
    }


    /* ==============================
       MARCA
       ============================== */

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;

      padding: 3px 8px 24px;

      color: white;
      text-decoration: none;
    }


    .brand-icon {
      width: 36px;
      height: 36px;

      display: grid;
      place-items: center;

      flex-shrink: 0;
    }


    .brand-icon svg {
      width: 31px;
      height: 31px;

      stroke: white;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }


    .brand-copy {
      display: flex;
      flex-direction: column;

      min-width: 0;
      line-height: 1;
    }


    .brand-copy strong {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.35px;
    }


    .brand-copy small {
      margin-top: 6px;

      font-size: 8px;
      font-weight: 700;

      letter-spacing: 2px;

      color: rgba(255, 255, 255, 0.58);
    }


    /* ==============================
       NAVEGACIÓN
       ============================== */

    .nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }


    .nav a {
      display: flex;
      align-items: center;
      gap: 12px;

      min-height: 44px;

      padding: 0 13px;

      border-radius: 8px;

      color: rgba(255, 255, 255, 0.82);
      text-decoration: none;

      font-size: 13px;
      font-weight: 700;

      transition:
        background 160ms ease,
        color 160ms ease;
    }


    .nav a svg {
      width: 19px;
      height: 19px;

      flex-shrink: 0;

      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }


    .nav a:hover {
      color: white;

      background:
        rgba(255, 255, 255, 0.07);
    }


    .nav a.active {
      color: white;

      background:
        linear-gradient(
          90deg,
          #145da0,
          #1767ae
        );

      box-shadow:
        0 5px 14px
        rgba(0, 0, 0, 0.12);
    }


    /* ==============================
       USUARIO
       ============================== */

    .sidebar-bottom {
      padding-top: 16px;

      border-top:
        1px solid
        rgba(255, 255, 255, 0.09);
    }


    .user {
      display: flex;
      align-items: center;
      gap: 10px;

      padding: 0 8px 13px;
    }


    .avatar {
      width: 34px;
      height: 34px;

      display: grid;
      place-items: center;

      flex-shrink: 0;

      border-radius: 50%;

      background: #dbeafe;
      color: #174b78;

      font-size: 11px;
      font-weight: 800;
    }


    .user-copy {
      display: flex;
      flex-direction: column;

      min-width: 0;
    }


    .user-copy strong {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      color: white;

      font-size: 11px;
      font-weight: 700;
    }


    .user-copy small {
      margin-top: 3px;

      color:
        rgba(255, 255, 255, 0.58);

      font-size: 9px;
    }


    .logout {
      width: 100%;

      display: flex;
      align-items: center;
      gap: 9px;

      padding: 9px 8px;

      border: 0;
      border-radius: 8px;

      color:
        rgba(255, 255, 255, 0.75);

      background: transparent;

      font: inherit;
      font-size: 11px;
      font-weight: 600;

      cursor: pointer;

      transition:
        color 160ms ease,
        background 160ms ease;
    }


    .logout:hover {
      color: white;

      background:
        rgba(255, 255, 255, 0.07);
    }


    .logout svg {
      width: 16px;
      height: 16px;

      fill: none;
      stroke: currentColor;

      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }


    /* ==============================
       CONTENIDO
       ============================== */

    .content {
      min-width: 0;
      min-height: 100vh;

      overflow-x: hidden;

      background:
        linear-gradient(
          135deg,
          #f6f9fd 0%,
          #eef4fa 100%
        );
    }


    /* ==============================
       RESPONSIVE
       ============================== */

    @media (max-width: 760px) {

      .operator-shell {
        grid-template-columns: 72px minmax(0, 1fr);
      }


      .sidebar {
        width: 72px;
        padding-left: 9px;
        padding-right: 9px;
      }


      .brand {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }


      .brand-copy,
      .nav a span,
      .user-copy,
      .logout span {
        display: none;
      }


      .nav a {
        justify-content: center;
        padding: 0;
      }


      .user {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }


      .logout {
        justify-content: center;
        padding-left: 0;
        padding-right: 0;
      }

    }
  `]
})
export class OperatorLayout {

  readonly auth =
    inject(AuthService);


  private readonly router =
    inject(Router);


  iniciales(
    nombre: string
  ): string {

    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(
        parte =>
          parte[0]?.toUpperCase() ?? ''
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