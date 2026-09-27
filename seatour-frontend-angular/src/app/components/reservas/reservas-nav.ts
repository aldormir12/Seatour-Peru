import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { inicioPorRol, reservasPorRol } from '../../navigation';

interface NavLink {
  label: string;
  route: string;
}

@Component({
  selector: 'app-reservas-nav',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav class="nav-shell" aria-label="Navegación principal">
      <div class="nav-left">
        <a class="brand" routerLink="/">
          <span class="brand-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 13c2.2-2 4.5-2 6.7 0 2.2 2 4.5 2 6.6 0" />
              <path d="M5 9c1.8-1.5 3.8-1.5 5.6 0 1.8 1.5 3.8 1.5 5.6 0" />
            </svg>
          </span>

          <span class="brand-text">
            <strong>SeaTour</strong>
            <small>PERÚ</small>
          </span>
        </a>

        <div class="nav-links">
          @for (link of enlaces(); track link.route) {
            <a [routerLink]="link.route">
              {{ link.label }}
            </a>
          }
        </div>
      </div>

      <div class="nav-right">
        @if (auth.usuario(); as usuario) {
          <button class="notification-btn" type="button" aria-label="Notificaciones">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 4a4 4 0 0 0-4 4v2.1c0 .7-.2 1.3-.6 1.9L6 14.2V16h12v-1.8L16.6 12c-.4-.6-.6-1.2-.6-1.9V8a4 4 0 0 0-4-4Z" />
              <path d="M10 18a2 2 0 0 0 4 0" />
            </svg>
            <span class="notification-dot"></span>
          </button>

         <div class="user-actions">

  <a
    class="user-chip"
    routerLink="/app/perfil"
    aria-label="Ver mi perfil"
  >
    <span class="avatar">
      {{ iniciales(usuario.nombre) }}
    </span>

    <span class="user-copy">
      <small>Hola,</small>
      <strong>{{ usuario.nombre }}</strong>
    </span>

    <svg
      class="profile-arrow"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  </a>

  <button
    class="logout-btn"
    type="button"
    (click)="salir()"
    aria-label="Cerrar sesión"
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5H5v14h4" />
      <path d="M13 8l4 4-4 4" />
      <path d="M8 12h9" />
    </svg>
  </button>

</div>
        } @else {
          <div class="guest-actions">
            <a class="ghost-link" routerLink="/login">Iniciar sesión</a>
            <a class="primary-link" routerLink="/registro">Registrarse</a>
          </div>
        }
      </div>
    </nav>
  `,
  styles: [`
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
      padding: 20px 28px;
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
      background: rgba(17, 155, 227, 0.18);
      border: 1px solid rgba(128, 220, 255, 0.4);
      backdrop-filter: blur(8px);
    }

    .brand-icon svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: #70d5ff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1;
    }

    .brand-text strong {
      font-size: 17px;
      font-weight: 800;
      letter-spacing: -0.4px;
    }

    .brand-text small {
      margin-top: 3px;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 3px;
      color: rgba(255, 255, 255, 0.82);
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
      flex-wrap: wrap;
    }

    .nav-links a {
      color: rgba(255, 255, 255, 0.9);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      transition: color 160ms ease, opacity 160ms ease;
    }

    .nav-links a:hover {
      color: white;
    }

    .nav-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .notification-btn {
      position: relative;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 999px;
      background: rgba(31, 43, 59, 0.24);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      cursor: pointer;
      padding: 0;
    }

    .notification-btn svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: white;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.95;
    }

    .notification-dot {
      position: absolute;
      top: 10px;
      right: 11px;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #ffffff;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.12);
    }

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
    rgba(255, 255, 255, 0.18);

  border-radius: 999px;

  background:
    rgba(31, 43, 59, 0.42);

  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  transition:
    background 160ms ease,
    border-color 160ms ease;
}

.user-chip:hover {
  background:
    rgba(31, 43, 59, 0.58);

  border-color:
    rgba(255, 255, 255, 0.28);
}

.avatar {
  width: 32px;
  height: 32px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  background: #e7f8ff;
  color: #063148;

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
    rgba(255, 255, 255, 0.74);

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
  stroke-linecap: round;
  stroke-linejoin: round;

  opacity: 0.75;
}

.logout-btn {
  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  padding: 0;

  border:
    1px solid
    rgba(255, 255, 255, 0.16);

  border-radius: 50%;

  color:
    rgba(255, 255, 255, 0.82);

  background:
    rgba(31, 43, 59, 0.3);

  cursor: pointer;

  transition:
    background 160ms ease,
    color 160ms ease;
}

.logout-btn:hover {
  color: white;

  background:
    rgba(180, 40, 40, 0.38);
}

.logout-btn svg {
  width: 16px;
  height: 16px;

  fill: none;
  stroke: currentColor;

  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}
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
      border-radius: 999px;
      padding: 11px 16px;
    }

    .ghost-link {
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(31, 43, 59, 0.24);
    }

    .primary-link {
      color: white;
      background: #159fe1;
    }

    @media (max-width: 980px) {
      .nav-shell {
        flex-direction: column;
        align-items: flex-start;
        padding: 18px 18px;
      }

      .nav-left {
        width: 100%;
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .nav-links {
        gap: 14px;
      }

      .nav-right {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `]
})
export class ReservasNav {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly enlaces = computed<NavLink[]>(() => {
    const usuario = this.auth.usuario();

    if (!usuario) {
      return [
        { label: 'Inicio', route: '/' },
        { label: 'Tours', route: '/app/tours' },
        { label: 'Experiencias', route: '/app/rutas' },
        { label: 'Mis reservas', route: '/login' }
      ];
    }

    if (usuario.rol === 'CLIENTE') {
      return [
        { label: 'Inicio', route: '/app/dashboard' },
        { label: 'Tours', route: '/app/tours' },
        { label: 'Experiencias', route: '/app/rutas' },
        { label: 'Mis reservas', route: '/app/mis-reservas' }
      ];
    }

    return [
      { label: 'Inicio', route: inicioPorRol(usuario.rol) },
      { label: 'Salidas', route: `${inicioPorRol(usuario.rol)}/salidas` },
      { label: 'Reservas', route: reservasPorRol(usuario.rol) },
      { label: 'Embarcaciones', route: `${inicioPorRol(usuario.rol)}/embarcaciones` }
    ];
  });

  iniciales(nombre: string): string {
    return nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(parte => parte[0]?.toUpperCase() ?? '')
      .join('');
  }

  async salir(): Promise<void> {
    if (await this.router.navigateByUrl('/')) {
      this.auth.logout();
    }
  }
}