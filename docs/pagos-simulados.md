# Pagos simulados de reservas

Implementación exclusivamente simulada: no contacta bancos ni Yape y no mueve dinero.

## Endpoint

`POST /api/reservas/{reservaId}/pagos`

Cabeceras: `Authorization: Bearer <token CLIENTE>` y `Content-Type: application/json`.
Solo el CLIENTE propietario puede pagar una reserva PENDIENTE. El monto se obtiene del
`precioTotal` histórico de la reserva; no se recibe un monto del cliente.

### Tarjeta: aprobación

```json
{
  "metodo": "TARJETA",
  "tarjeta": {
    "numero": "5555555555554444",
    "mes": 12,
    "anio": 2099,
    "cvv": "123",
    "titular": "Cliente Prueba"
  }
}
```

Para rechazo, usar `4111111111111111` manteniendo los demás campos.
Ambos números de prueba pasan Luhn. Usar únicamente datos ficticios.

Se aceptan entre 13 y 19 dígitos ASCII, sin espacios ni guiones, con Luhn válido.
Mes entre 1 y 12, año entre 1 y 9999 y vencimiento no anterior al mes actual
(America/Lima); la tarjeta sigue vigente durante todo su mes de vencimiento.
CVV de 3 o 4 dígitos y titular no vacío (máximo 150 caracteres).

### Yape: aprobación

```json
{
  "metodo": "YAPE",
  "yape": {
    "celular": "987654321",
    "codigoAprobacion": "123456"
  }
}
```

Para rechazo usar `codigoAprobacion: "123457"`.
Celular: exactamente nueve dígitos, empezando en 9. Código: exactamente seis dígitos.
Este formato es una convención de la simulación, no una integración con Yape.
No enviar los bloques tarjeta e yape juntos.

## Regla determinista

Después de validar, el último dígito del número de tarjeta o del código Yape determina
el resultado: par = APROBADO, impar = RECHAZADO. No usa azar ni flags enviados por el cliente.

Cada intento válido genera un Pago y una referencia `SIM-<pagoId>` persistente (derivada
 de su identificador). Una respuesta de ejemplo, con IDs y monto ilustrativos:

```json
{
  "estadoPago": "APROBADO",
  "estadoReserva": "CONFIRMADA",
  "reservaId": 1,
  "pagoId": 1,
  "metodo": "TARJETA",
  "monto": 160.50,
  "referencia": "SIM-1",
  "mensaje": "Pago simulado aprobado; reserva confirmada",
  "motivoRechazo": null
}
```

Rechazo: `estadoPago=RECHAZADO`, `estadoReserva=PENDIENTE`,
`motivoRechazo=RECHAZO_SIMULADO`. Permite reintentar con datos válidos.
Ambos resultados de simulación devuelven HTTP 200; los errores de validación no crean pagos.

## Garantías y errores

- 400: datos de pago o ID inválidos.
- 401: sin sesión válida.
- 403: rol diferente de CLIENTE.
- 404: reserva inexistente o de otro cliente.
- 409: reserva no pendiente, pago ya aprobado o conflicto al confirmar la salida.
- Monto, estado y propietario se determinan en el servidor.
- Bloquea primero salida y después reserva, igual que confirmar/cancelar. Dos solicitudes
  simultáneas no pueden aprobar dos pagos. Una clave única nullable `reservaAprobadaId`
  refuerza la restricción en la base de datos y permite múltiples rechazos.
- La aprobación reutiliza las validaciones de confirmación de ReservaService. No habilita
  el endpoint administrativo de confirmación para CLIENTE ni suplanta un rol de gestor.
- Guardar pago y confirmar reserva es una sola transacción. Si confirmar falla, se revierte
  el pago; no queda un aprobado con reserva pendiente.
- Los cupos ya se descontaron al crear la reserva: aprobar o rechazar no los modifica.
- De la tarjeta solo se persisten últimos cuatro dígitos y marca reconocida (VISA,
  MASTERCARD o AMEX; null para otras). No se guardan PAN, CVV ni titular. Tampoco se
  persisten celular ni código Yape. Los DTO ocultan estos datos en toString().
- No implementa reembolsos ni cambia las reglas existentes de cancelación.

## Pruebas

`./mvnw.cmd test "-Dtest=PagoIntegrationTest,ReservaIntegrationTest"`

Cubren ambas formas de pago, rechazo/reintento, monto histórico, propietario/roles,
validaciones, persistencia limitada, rollback y pagos concurrentes.
