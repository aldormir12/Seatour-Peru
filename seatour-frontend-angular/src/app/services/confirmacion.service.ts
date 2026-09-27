import { Injectable, signal } from '@angular/core';

export interface ConfirmacionOpciones {
  titulo: string;
  mensaje: string;
  variante?: 'danger' | 'warning';
  textoConfirmar?: string;
  textoCancelar?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  private readonly estado = signal<ConfirmacionOpciones | null>(null);
  readonly solicitud = this.estado.asReadonly();
  private resolver?: (resultado: boolean) => void;

  confirmar(opciones: ConfirmacionOpciones): Promise<boolean> {
    // Nunca sustituir una confirmación pendiente por otra acción.
    if (this.resolver) return Promise.resolve(false);
    return new Promise(resolve => {
      this.resolver = resolve;
      this.estado.set(opciones);
    });
  }

  responder(resultado: boolean): void {
    const resolver = this.resolver;
    this.resolver = undefined;
    this.estado.set(null);
    resolver?.(resultado);
  }
}
