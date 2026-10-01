# Reservas por cantidades

POST /api/reservas (CLIENTE autenticado):

```json
{
  "salidaId": 3,
  "ninos": 1,
  "adultos": 1,
  "adultosMayores": 1,
  "precioEsperado": 200.63
}
```

Las tres cantidades son obligatorias, enteras y no negativas. Su suma debe ser al menos
1 y no superar los cupos. El servidor calcula `totalPasajeros`; no recibe ni necesita
nombres, documentos, fechas de nacimiento o detallePasajeros.

Reglas centralizadas en TarifasPasajerosService, consultables por GET /api/reservas/tarifas:
NINO (0–12), 30%; ADULTO (13–59), 0%; ADULTO_MAYOR (60+), 20%.
La selección de categoría es declarativa, sin comprobación de edad por fecha.

Se redondea cada tarifa individual a dos decimales (HALF_UP), se multiplica por la
cantidad y se suman subtotales. Con base 80.25: niño 56.18, adulto 80.25, mayor 64.20.
Una persona de cada categoría suma 200.63 y consume tres cupos.

`precioEsperado` es opcional y representa el total. Una diferencia devuelve 409 sin
crear reserva ni consumir cupos. Los precios los calcula siempre el backend.

ReservaRespuesta devuelve ninos, adultos, adultosMayores y totalPasajeros, además de
los campos anteriores. `pasajeros` conserva la misma suma por compatibilidad con
cupos, confirmación y cancelación. El pago sigue usando precioTotal histórico.
Las cantidades se guardan en Reserva. Las reservas anteriores sin cantidades tienen
estos tres campos null; conservan su total histórico y su número de pasajeros.

El formulario muestra tres contadores. Puede quedar temporalmente en cero para cambiar
categoría incluso si solo queda un cupo; Continuar está bloqueado hasta seleccionar uno.
No se cambian pago, confirmación ni cancelación.
