import { Component, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reservas-nav', imports: [RouterLink],
  template: `<nav aria-label="Navegación de reservas">
    <a routerLink="/">SeaTour · Inicio</a><a routerLink="/salidas">Ver salidas</a>
    @if (auth.tieneRol('CLIENTE')) { <a routerLink="/mis-reservas">Mis reservas</a> }
    @if (auth.tieneRol('OPERADOR', 'ADMIN')) { <a routerLink="/gestion/reservas">Gestionar reservas</a> }
    @if (auth.usuario(); as usuario) {
      <span>{{ usuario.nombre }}</span><button type="button" (click)="salir()">Cerrar sesión</button>
    } @else { <a routerLink="/login">Iniciar sesión</a><a routerLink="/registro">Registrarse</a> }
  </nav>`,
  styles: [`nav { display:flex; flex-wrap:wrap; align-items:center; gap:1rem; padding:1.2rem; background:#07334a; color:white; }
    a { color:white; } button { padding:.5rem; cursor:pointer; } span { margin-left:auto; }`]
})
export class ReservasNav {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly protegida = input(false);
  constructor() {
    effect(() => {
      if (this.protegida() && !this.auth.usuario()) {
        void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url, sesion: 'expirada' } });
      }
    });
  }
  salir() { void this.router.navigateByUrl('/').then(() => this.auth.logout()); }
}
