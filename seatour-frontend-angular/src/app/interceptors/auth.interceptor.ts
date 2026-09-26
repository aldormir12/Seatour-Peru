import {
  HttpInterceptorFn
} from '@angular/common/http';

import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn =
  (req, next) => {

    const auth = inject(AuthService);
    const token = auth.obtenerToken();

    if (!token) {
      return next(req);
    }

    const requestConToken = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    return next(requestConToken);
  };