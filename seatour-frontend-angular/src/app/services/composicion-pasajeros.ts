import { CantidadesPasajeros, TipoPasajero } from './reservas.service';

export function cantidadPasajero(cantidades: CantidadesPasajeros, tipo: TipoPasajero): number {
  return cantidades[clavePasajero(tipo)];
}

function clavePasajero(tipo: TipoPasajero): keyof CantidadesPasajeros {
  return tipo === 'NINO' ? 'ninos' : tipo === 'ADULTO' ? 'adultos' : 'adultosMayores';
}

// Misma regla de los controles individuales; el límite lo establece la disponibilidad del flujo.
export function cambiarComposicionPasajeros(cantidades: CantidadesPasajeros, tipo: TipoPasajero,
    cambio: number, totalActual: number, limite: number): CantidadesPasajeros | null {
  const cantidad = cantidadPasajero(cantidades, tipo) + cambio;
  const total = totalActual + cambio;
  if (cantidad < 0 || total < 0 || total > limite) return null;
  return { ...cantidades, [clavePasajero(tipo)]: cantidad };
}
