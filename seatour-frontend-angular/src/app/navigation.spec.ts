import { destinoTrasLogin, inicioPorRol } from './navigation';

describe('Destino después de autenticar', () => {
  it.each(['CLIENTE', 'OPERADOR', 'ADMIN'] as const)('elige el inicio de %s', rol => {
    expect(destinoTrasLogin(rol, null)).toBe(inicioPorRol(rol));
    for (const url of ['//example.com', 'https://example.com', '/login', '/app/admin/usuarios/otro']) {
      expect(destinoTrasLogin(rol, url)).toBe(inicioPorRol(rol));
    }
  });
  it('conserva una reserva pendiente y los filtros del mapa', () => {
    expect(destinoTrasLogin('CLIENTE', '/reservar/3')).toBe('/app/reservar/3');
    expect(destinoTrasLogin('CLIENTE', '/app/tours?tourId=8')).toBe('/app/tours?tourId=8');
    expect(destinoTrasLogin('OPERADOR', '/gestion/reservas')).toBe('/app/operador/reservas');
  });
  it('rechaza destinos de otros roles', () => {
    expect(destinoTrasLogin('CLIENTE', '/app/admin')).toBe('/app/dashboard');
    expect(destinoTrasLogin('ADMIN', '/app/operador/reservas')).toBe('/app/admin');
    expect(destinoTrasLogin('OPERADOR', '/app/reservar/3')).toBe('/app/operador');
  });
});
