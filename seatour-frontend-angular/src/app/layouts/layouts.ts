import { Component, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ReservasNav } from '../components/reservas/reservas-nav';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class PublicLayout {}

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet, ReservasNav],
  template: '<app-reservas-nav /><router-outlet />'
})
export class PrivateLayout {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (!this.auth.usuario()) {
        void this.router.navigate(['/login'], {
          queryParams: {
            returnUrl: this.router.url,
            sesion: 'expirada'
          }
        });
      }
    });
  }
}

@Component({
  selector: 'app-role-layout',
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class RoleLayout {}