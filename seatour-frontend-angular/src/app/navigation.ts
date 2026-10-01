import { RolUsuario } from './services/auth.service';
export function inicioPorRol(rol?: RolUsuario): string {
  return rol === 'ADMIN' ? '/app/admin' : rol === 'OPERADOR' ? '/app/operador' : '/app/dashboard';
}
export function reservasPorRol(rol?: RolUsuario): string {
  if (rol === 'ADMIN') return '/app/admin';
  return rol === 'CLIENTE' ? '/app/mis-reservas' : `${inicioPorRol(rol)}/reservas`;
}
// Retomar solo destinos conocidos del mismo rol, incluidos enlaces antiguos.
export function destinoTrasLogin(rol: RolUsuario, destino: string | null): string {
  if (!destino) return inicioPorRol(rol);
  destino = destino.replace(/^\/reservar\//, '/app/reservar/')
    .replace(/^\/salidas(?=[?#]|$)/, '/app/tours')
    .replace(/^\/mis-reservas(?=[?#]|$)/, '/app/mis-reservas')
    .replace(/^\/gestion\/reservas(?=[?#]|$)/, reservasPorRol(rol))
    .replace(/^\/reservas\//, `${reservasPorRol(rol)}/`);
  const patron = rol === 'CLIENTE'
    ? /^\/app\/(dashboard|tours|rutas|mis-reservas(?:\/\d+)?|reservar\/\d+)(?:[?#].*)?$/
    : rol === 'ADMIN'
      ? /^\/app\/admin(?:\/(usuarios|tours|categorias|salidas|embarcaciones))?(?:[?#].*)?$/
      : /^\/app\/operador(?:\/mis-salidas(?:\/\d+)?)?(?:[?#].*)?$/;
  return patron.test(destino) ? destino : inicioPorRol(rol);
}
