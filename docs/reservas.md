# Reservas de SeaTour

## Flujo y reglas

- `/salidas` consulta salidas reales del backend. La portada y el mapa enlazan al catálogo; el mapa filtra por tour solo si existe en la respuesta del backend.
- Un `CLIENTE` autenticado selecciona pasajeros en `/reservar/:salidaId`, revisa fecha, precio unitario y total y envía la solicitud. Se vuelve a consultar disponibilidad antes del resumen.
- El backend obtiene la identidad del principal autenticado por JWT. No acepta cliente, estado ni importes calculados por el navegador como fuente de verdad.
- Se usa el precio base vigente del tour, en PEN, y se conservan precio unitario y total en la reserva. El `precioEsperado` opcional solo detecta un cambio de tarifa desde el resumen; si difiere del precio del servidor, devuelve 409 y no reserva.
- Solo se reservan salidas `PROGRAMADA`, futuras según `America/Lima`, de tours activos y con cupos suficientes. Pasajeros debe ser un entero positivo.
- La creación deja la reserva `PENDIENTE` y descuenta cupos inmediatamente. No hay vencimiento automático de pendientes.
- `OPERADOR` y `ADMIN` pueden confirmar una reserva pendiente antes de la salida. Confirmar no vuelve a descontar cupos.
- Propietario, operador y administrador pueden cancelar una reserva pendiente o confirmada antes del comienzo de la salida. La cancelación es definitiva.
- Una segunda cancelación devuelve la reserva cancelada sin volver a devolver cupos, incluso ante dos peticiones simultáneas.
- Las operaciones usan transacciones y bloqueos pesimistas de filas de la base de datos. El orden es siempre salida y luego reserva. No dependen de bloqueos en memoria del servidor.
- Las salidas con historial de reservas no se pueden editar ni eliminar mediante la API existente: se devuelve 409 para preservar fecha, asignación y cupos. Las tarifas de tours pueden seguir cambiando sin modificar importes históricos.
- El cliente solo lista sus reservas y solo consulta/cancela las propias. Una reserva ajena devuelve 404 para no revelar su existencia.
- Las páginas protegidas se renderizan en el cliente y usan guard de sesión y roles. Si caduca la sesión, se regresa al login.
- Después de crear o cancelar se actualizan los cupos compartidos en Angular; al volver al catálogo o usar Actualizar se consulta el servidor. No se implementan actualizaciones en tiempo real entre navegadores.

## API

| Método | Endpoint | Acceso | Resultado |
| --- | --- | --- | --- |
| GET | `/api/salidas` | Público | Salidas, precio por pasajero, cupos y `reservable` |
| GET | `/api/salidas/tour/{tourId}` | Público | Salidas de un tour |
| GET | `/api/salidas/{id}` | Público | Disponibilidad y tarifa actual |
| POST | `/api/reservas` | CLIENTE | 201, reserva pendiente y cabecera Location |
| GET | `/api/reservas/mis-reservas` | CLIENTE | Reservas propias |
| GET | `/api/reservas` | OPERADOR, ADMIN | Todas las reservas |
| GET | `/api/reservas/{id}` | Propietario, OPERADOR, ADMIN | Detalle |
| POST | `/api/reservas/{id}/confirmar` | OPERADOR, ADMIN | Reserva confirmada |
| POST | `/api/reservas/{id}/cancelar` | Propietario, OPERADOR, ADMIN | Reserva cancelada, operación idempotente |

Crear una reserva:

```json
{ "salidaId": 12, "pasajeros": 2, "precioEsperado": 80.25 }
```

Confirmar y cancelar no necesitan datos del cliente ni importes en el cuerpo. La respuesta incluye `puedeConfirmar`, `puedeCancelar`, fechas de creación/confirmación/cancelación y cupos disponibles. El backend siempre vuelve a validar las reglas al ejecutar la acción.

- **400:** JSON, identificador o cantidad inválidos. Se desactiva la conversión silenciosa de números fraccionarios a enteros.
- **401:** JWT ausente, inválido o vencido; Angular utiliza el interceptor de sesión existente.
- **403:** rol no autorizado para la operación.
- **404:** salida/reserva inexistente o reserva ajena.
- **409:** cupos insuficientes, salida cerrada/pasada, precio cambiado, transición inválida, conflicto de bloqueo o intento de editar una salida con reservas.

## Archivos del módulo

Backend (`src/main/java/com/seatour/seatour/`):

- Nuevos: `model/Reserva.java`, `model/EstadoReserva.java`, `repository/ReservaRepository.java`, `dto/ReservaCreacion.java`, `dto/ReservaRespuesta.java`, `service/ReservaService.java`, `controller/ReservaController.java`.
- Adaptados: `repository/SalidaProgramadaRepository.java`, `service/SalidaProgramadaService.java`, `dto/SalidaProgramadaRespuesta.java`, `controller/SalidaProgramadaController.java`, `config/SecurityConfig.java`, `controller/ApiErrores.java`.
- Configuración: `src/main/resources/application.properties` para rechazar cantidades fraccionarias.

Angular (`seatour-frontend-angular/`):

- Nuevos: `src/app/services/reservas.service.ts`, `src/app/guards/role.guard.ts` y `src/app/components/reservas/` (catálogo, formulario/resumen, listados, detalle, navegación, acceso denegado y estilos).
- Adaptados: `src/app/app.routes.ts`, `src/app/app.routes.server.ts`, `src/app/components/inicio/inicio.html` y el componente `rutas-interactivas` para enlaces de reservas.
- `src/app/services/auth.service.ts`: consulta de sesión sin efectos secundarios al renderizar enlaces por rol.
- `src/app/app.css`, `src/styles.css`, `angular.json`: fuentes globales y presupuesto máximo de CSS de 10 kB para admitir el mapa existente; se mantienen las advertencias de 4 kB.

## Verificación

- `ReservaIntegrationTest`: precio calculado e histórico, identidad desde JWT, aislamiento entre clientes, permisos, validaciones, estados, disponibilidad, bloqueo de cambios de salida, reservas concurrentes y cancelaciones concurrentes.
- `components/reservas/reservas.spec.ts`: resumen, total, cantidades, conflictos, doble envío, cupos, cancelación, confirmación, listado personal, errores y guard de roles.
- Adaptación de proveedores de router en `rutas-interactivas.spec.ts` para los nuevos enlaces.
- Suite backend completa: 129 pruebas aprobadas.
- Suite Angular completa: 52 pruebas aprobadas.
- Build de producción completado; quedan advertencias de tamaño en los estilos existentes de portada y mapa.

Comandos:

```powershell
.\mvnw.cmd test "-Dspring.datasource.url=jdbc:h2:mem:seatour-tests;DB_CLOSE_DELAY=-1"
cd seatour-frontend-angular
npm.cmd test -- --watch=false
npm.cmd run build
```

El esquema se incorpora con la configuración JPA `ddl-auto=update` existente; no hay cambios destructivos de tablas. La ejecución habitual conserva el requisito de `SEATOUR_JWT_SECRET`. La prueba HTTP usa una base H2 temporal, sin modificar `data/seatourdb`.

No se implementan pagos, reembolsos, emails, refresh tokens ni cupones. El video `hero-seatour.mp4` permanece ignorado y fuera de Git.
