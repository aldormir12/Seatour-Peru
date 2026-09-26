import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL, AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const esApi = req.url.startsWith(`${API_URL}/`);
  const publica = req.method === 'POST' &&
    [ `${API_URL}/auth/login`, `${API_URL}/usuarios` ].includes(req.url);
  const token = esApi && !publica ? auth.obtenerToken() : null;
  const request = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(request).pipe(catchError(error => {
    if (token && error instanceof HttpErrorResponse && error.status === 401 && auth.obtenerToken() === token) {
      auth.logout();
      void router.navigate(['/login'], { queryParams: { sesion: 'expirada' } });
    }
    return throwError(() => error);
  }));
};
