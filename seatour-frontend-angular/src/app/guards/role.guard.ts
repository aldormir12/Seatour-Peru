import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, RolUsuario } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.estaAutenticado()) return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  // Los hijos de un layout con componente no siempre heredan sus datos.
  const roles = [...(route.pathFromRoot ?? [route])].reverse()
    .find(snapshot => snapshot.data['roles'])?.data['roles'] as RolUsuario[] | undefined;
  return (roles?.length && auth.tieneRol(...roles)) || router.createUrlTree(['/sin-acceso']);
};
