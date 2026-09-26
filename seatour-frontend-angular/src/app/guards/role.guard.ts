import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, RolUsuario } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaAutenticado()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  return auth.tieneRol(...(route.data['roles'] as RolUsuario[])) || router.createUrlTree(['/sin-acceso']);
};
