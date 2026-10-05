import { HttpErrorResponse } from '@angular/common/http';

export function mensajeConflictoLive(error: HttpErrorResponse): string {
  switch (error.error?.detail) {
    case 'La transmisión no está activa':
      return 'La transmisión aún no está activa o ya terminó. Actualiza la lista e inténtalo nuevamente.';
    case 'La salida no está EN_CURSO':
      return 'La salida ya no está en curso. Actualiza la lista.';
    default:
      return 'El estado de la transmisión cambió. Actualiza la lista e inténtalo nuevamente.';
  }
}
