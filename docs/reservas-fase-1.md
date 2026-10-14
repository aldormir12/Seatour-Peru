# Reservas: primera fase

## Reglas implementadas

- Un CLIENTE puede crear una sola reserva PENDIENTE o CONFIRMADA por salida. Las CANCELADAS no cuentan.
- La comprobación se hace después de adquirir PESSIMISTIC_WRITE sobre la salida, dentro de la misma transacción que descuenta cupos. Aplica tanto a reservas individuales como a experiencias de un plan.
- PUT /api/reservas/{id} modifica composición de pasajeros y adicionales. No cambia cliente, salida, estado ni fecha de creación.
- Autorización: CLIENTE propietario, ADMIN, u OPERADOR asignado a la salida. Se conservan las restricciones anteriores de confirmación/cancelación.
- Solo se modifica una reserva activa con salida PROGRAMADA y futura, tour/embarcación activos y ocupación consistente.
- Los cupos se actualizan por la diferencia entre nuevos y anteriores pasajeros. La salida y reserva quedan bloqueadas durante toda la operación.
- revisionEsperada obligatoria evita que dos ediciones del mismo detalle se sobrescriban. Una revisión desactualizada devuelve 409.
- precioEsperado obligatorio se compara con el recálculo del backend para impedir aceptar una tarifa diferente sin revisión.
- La modificación revaloriza toda la reserva con tarifa base vigente, descuentos vigentes y precios vigentes de adicionales. Un adicional inactivo o desvinculado debe retirarse.
- Se borran los adicionales anteriores con orphanRemoval y flush antes de insertar los nuevos para respetar la unicidad reserva/adicional. Todo revierte si falla una etapa posterior.
- Cada modificación almacena actor, fecha, importes anterior/nuevo y detalle anterior/nuevo en reserva_modificaciones.
- Si existe un pago APROBADO, la diferencia se registra como COBRO_ADICIONAL_SIMULADO, REEMBOLSO_SIMULADO o SIN_AJUSTE. No se modifica el pago original, no se llama a una pasarela ni se generan transacciones reales.
- Sin pago aprobado, se registra REVALORIZACION con ajuste simulado cero. Una confirmación administrativa no equivale a un pago.
- La modificación genera una notificación distinta por movimiento; el cambio, historial, cupos y notificación confirman o revierten juntos.
- CLIENTE no puede modificar ni cancelar cuando la hora vigente de salida sea menor o igual a ahora + 24 horas (America/Lima). ADMIN/OPERADOR no reciben ese límite.
- Las cancelaciones ya realizadas siguen siendo idempotentes. Consultar, reservar, pagar y calificar mantienen su alcance anterior; esta fase no introduce un cierre de pago a las 24 horas.
- Si ADMIN reprograma, el plazo del CLIENTE se calcula con el nuevo horario vigente.

## Contrato de modificación

Cuerpo de PUT /api/reservas/{id}:

    {
      "ninos": 1,
      "adultos": 2,
      "adultosMayores": 0,
      "adicionalesIds": [],
      "precioEsperado": 270.00,
      "revisionEsperada": 0
    }

El precio es ilustrativo: debe corresponder al resumen calculado para el tour actual.
La respuesta conserva los campos anteriores y agrega puedeModificar, bloqueadaPorPlazo,
revision, pagada e historialEconomico.

## Planes e historial

La selección original del checkout se conserva en plan_seleccion_original. Los reintentos
se comparan con esa selección, aunque una reserva del plan haya sido editada después.
Los planes preexistentes capturan su selección antes de su primera modificación.
Editar una experiencia no modifica automáticamente las demás reservas del plan.
Los pagos originales y comprobantes de correo existentes permanecen históricos; esta
fase no reemite correos ni integra ajustes al dashboard financiero.

## Persistencia y alcance

No se ejecutaron comandos de base de datos, Docker, builds ni pruebas. No se cambió
compose.yaml, Dockerfiles, .env ni la configuración de PostgreSQL.
El modelo incorpora dos columnas nullable en reservas: revision y plan_seleccion_original,
y una tabla nueva reserva_modificaciones. Las filas anteriores interpretan revisión null
como cero. El esquema requiere una actualización aditiva antes de usar esta versión;
el proyecto mantiene su ddl-auto=update existente. Su aplicación real sigue pendiente.
No hay borrado de reservas, pagos originales ni volúmenes.

La nueva regla evita nuevas duplicaciones, pero no elimina ni fusiona duplicados ya
existentes. Antes de desplegar, inspeccionarlos con una consulta de solo lectura:

    SELECT cliente_id, salida_id, COUNT(*)
    FROM reservas
    WHERE estado IN ('PENDIENTE', 'CONFIRMADA')
    GROUP BY cliente_id, salida_id
    HAVING COUNT(*) > 1;

La exclusión mutua del backend protege las rutas de escritura actuales. No se agrega
un índice único parcial automáticamente: hacerlo sin resolver duplicados históricos
podría impedir la actualización del esquema. Escrituras externas directas a PostgreSQL
requieren su propia protección.

DEMO: no se modificaron servicios, filtros, controller, repositorio de salidas, scheduler,
interfaces demo ni SeaTour Live. Las reservas demo siguen rechazadas antes de cualquier
operación nueva. El historial nuevo no tiene rutas de eliminación ni relación con la
limpieza demo.

## Revisión estática realizada

Se analizaron las fuentes TypeScript y las tres plantillas HTML modificadas con los
analizadores locales: sin errores de sintaxis. Esto no compila, no verifica tipos ni
ejecuta pruebas; no confirma funcionamiento en PostgreSQL ni apariencia visual.

## Verificación pendiente (no ejecutada)

- Compilación y tipado de Spring Boot/Angular y renderizado visual de ambos detalles.
- Actualización aditiva y lectura de filas existentes en PostgreSQL real.
- Dos creaciones simultáneas del mismo cliente/salida: una creación y un 409.
- Dos clientes compitiendo por los últimos cupos al ampliar sus reservas: sin sobreventa.
- Dos ediciones con la misma revisión: solo una se acepta.
- Modificar, pagar y cancelar simultáneamente: bloqueo y estados coherentes.
- Reemplazar el mismo adicional, retirarlo y agregar varios: sin colisión del índice único.
- Revalorizar con tarifas nuevas, extras por persona y composición mixta.
- Ajustes positivos/negativos/cero de reservas pagadas sin cambiar pagos originales.
- Límite exacto de 24 horas, un instante antes/después y reprogramación en America/Lima.
- ADMIN/OPERADOR dentro de las 24 horas; aislamiento de reservas ajenas.
- Plan de varias experiencias, conflicto de una experiencia con reserva previa, rollback
  integral y reintento después de modificar una de sus reservas.
- Creación tras cancelar y revisión manual de duplicados históricos.
- Regresión de DEMO y Live sin cambios funcionales.
