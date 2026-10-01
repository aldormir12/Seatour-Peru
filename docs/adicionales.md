# Adicionales opcionales

En cada inicio del backend se crean o actualizan los tres adicionales acordados,
restaurando sus tarifas, estado activo y asociaciones con todos los tours actuales:

- Traslado desde hotel: S/ 5.00 POR_PERSONA.
- Almuerzo: S/ 15.00 POR_PERSONA.
- Fotografía profesional: S/ 15.00 POR_RESERVA.

Alquiler de equipo no se crea y, si existe, se desactiva y se desvincula de los tours.
Los antiguos borradores Almuerzo/comida y Fotografía también se desactivan y desvinculan.

Los tres se asocian a todos los tours existentes en cada inicio. Los tours
creados después se pueden asociar mediante el endpoint administrativo. No se cambia el
checkout de pasajeros ni los servicios de pago, confirmación y cancelación.

## Consulta y selección

GET /api/tours/{tourId}/adicionales devuelve solo adicionales activos y configurados
asociados a un tour activo. La respuesta contiene id, nombre, descripcion, precio,
tipoCobro y activo.

POST /api/reservas acepta el campo opcional adicionalesIds. Omitido, null o [] significa
sin adicionales. Ejemplo ilustrativo (sustituir IDs por los obtenidos del catálogo):

```json
{
  "salidaId": 3,
  "ninos": 0,
  "adultos": 2,
  "adultosMayores": 0,
  "adicionalesIds": [1, 3],
  "precioEsperado": 185.50
}
```

Con base de pasajeros 160.50, traslado para dos (10.00) y fotografía por reserva (15.00),
el total sería 185.50. El backend siempre obtiene precios y tipos del catálogo, valida
pertenencia al tour y estado activo, y rechaza IDs duplicados o inválidos.

- POR_PERSONA: precio × total de pasajeros, sin descuentos por edad en los adicionales.
- POR_RESERVA: precio una vez.
- POR_UNIDAD: una unidad por selección. No hay formularios o selector de cantidades.

ReservaRespuesta añade subtotalAdicionales y adicionales, con adicionalId, nombre,
descripcion, tipoCobro, cantidad, precioUnitario y subtotal. Son copias históricas:
los cambios posteriores al catálogo no alteran el total de una reserva ya creada.
precioEsperado compara el total final de pasajeros y adicionales.
Los adicionales no consumen cupos adicionales. PagoService sigue leyendo precioTotal.

## Configuración ADMIN

GET /api/admin/adicionales lista el catálogo, incluidos borradores.
PUT /api/admin/adicionales/{id} configura precio, tipo, estado y tours asociados:

```json
{
  "nombre": "Traslado desde hotel",
  "descripcion": "Traslado desde el hotel para los pasajeros de la reserva.",
  "precio": 5.00,
  "tipoCobro": "POR_PERSONA",
  "activo": true,
  "tourIds": [1, 2]
}
```

Requiere JWT ADMIN. El array tourIds reemplaza las asociaciones de ese adicional.
Los precios deben ser no negativos y tener hasta dos decimales. La inicializaci?n
restablece el cat?logo acordado en cada arranque; Alquiler de equipo queda retirado.

No se ejecutaron pruebas ni builds por solicitud del usuario.
