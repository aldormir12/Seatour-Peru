# Salidas programadas: fase 2

## Reglas y límites

Todos los cálculos del backend usan America/Lima; Angular interpreta las fechas locales
con offset -05:00. El reloj del backend decide la aceptación definitiva.

1. ADMIN solo crea una salida normal si su inicio es al menos ahora + 24 horas.
   La igualdad exacta está permitida; se comprueba otra vez tras bloquear/asignar recursos.
   La regla está exclusivamente en crear(), no en validarDatos(creacion), pues este último
   también se utiliza al cambiar una embarcación. Edición/reprogramación conserva sus
   restricciones actuales y no recibe automáticamente el mínimo de 24 horas.
2. Nuevas reservas requieren que el inicio sea posterior a ahora + 2 horas.
   En el instante exacto de 2 horas se cierra la ventana. Esta decisión de borde es la
   misma en backend y Angular. No se modifica la salida ni se vencen reservas al cerrar.
3. Al llegar la hora, el proceso automático normal cambia PROGRAMADA a NO_REALIZADA
   si no existe ninguna reserva PENDIENTE o CONFIRMADA, con el mismo bloqueo de escritura
   de salida que utilizan reserva, edición y cancelación. Las CANCELADAS no cuentan.
   Si existe una activa, se ejecuta el inicio automático anterior sin cambios.

## Reservas, planes y fase 1

- VentanaReservas centraliza el cierre para creación, resumen de planes y reservable.
- La creación revalida el plazo después de las esperas de bloqueos y antes de consumir cupos.
- El listado de salidas disponibles por tour consulta a partir de ahora + 2 horas;
  Intelligence y planes ya consumen ese listado y dejan de proponer salidas cerradas.
- Cada nueva reserva del plan pasa por la validación de creación; cualquier fallo revierte
  el checkout completo. El resumen identifica las experiencias cerradas.
- Angular bloquea la creación individual y el checkout de un plan al alcanzar el plazo,
  incluso si el detalle se dejó abierto. Conserva los reintentos de operaciones inciertas.
- El reintento de un plan ya realizado conserva el camino de idempotencia anterior;
  no se vuelve a cobrar ni reservar por introducir la ventana.
- Una reserva ya creada puede pagarse conforme a la lógica anterior. No se aplica la
  ventana de 2 horas a PagoService, a la confirmación administrativa ni a la modificación.
- La fase 1 conserva la unicidad cliente/salida, revisiones de edición, historial económico,
  ajustes simulados y límite de 24 horas para modificaciones/cancelaciones de CLIENTE.
- No se implementa vencimiento automático de reservas PENDIENTES.

## NO_REALIZADA

- Es un estado de salida, no de reserva.
- Solo lo asigna automáticamente el backend a salidas normales PROGRAMADAS vencidas sin
  reservas activas. ADMIN/OPERADOR no pueden seleccionarlo mediante PATCH de estado.
- Es terminal: no iniciar, finalizar, cancelar, editar, reprogramar, cambiar embarcación
  ni eliminar. Las validaciones existentes que exigen PROGRAMADA/EN_CURSO lo excluyen.
- Conserva la salida, reservas canceladas, historial económico, precios y cupos.
- No registra inicio_real ni fin_real ficticios, no altera pagos ni genera reembolsos.
- No genera notificaciones para clientes cuyas reservas ya estaban canceladas.
- Deja de ocupar el intervalo de embarcación y operador al validar nuevas asignaciones.
- ADMIN lo ve en Historial y puede filtrarlo; OPERADOR lo ve en Mis salidas, Hoy y detalle.
  Se reutilizan las clases y estructura de badges existentes.

El scheduler continúa cada 30 segundos. La transición se realiza en el siguiente ciclo
operativo, no exactamente al milisegundo del horario. Tras un reinicio también procesa
salidas normales atrasadas. No se ejecutó el scheduler durante esta implementación.

## DEMO, seguridad y persistencia

No se cambian permisos, servicios/filtro/controlador de modo demo, limpieza, LiveKit,
SeaTour Live ni el scheduler. Se conservan los bypass de creación e inicio existentes.
El nuevo mínimo de creación está condicionado a !esDemo; NO_REALIZADA queda detrás de
la exclusión demo ya existente en iniciarAutomaticamente(). Las demos siguen excluidas
de nuevas reservas. El nuevo filtro NO_REALIZADA no se añade a la vista DEMO de ADMIN.

No se ejecutaron builds, pruebas, Docker, SQL, migraciones, commits ni pushes.
No se tocaron .env, compose.yaml, Dockerfiles, volúmenes ni la configuración de PostgreSQL.

## Riesgo de esquema antes de desplegar

NO_REALIZADA cabe en la columna estado varchar(20) de salidas_programadas y se persiste
como texto, sin renombrar ni reinterpretar los valores anteriores. No requiere columnas
ni tablas nuevas.

Sin embargo, Hibernate puede haber creado un CHECK que enumera los cuatro estados antiguos.
Ese CHECK debe admitir NO_REALIZADA antes de que el scheduler intente guardarlo. No se ha
consultado ni alterado PostgreSQL en esta fase. No se debe asumir que ddl-auto=update
ampliará correctamente una restricción CHECK existente: debe revisarse en una copia o
mediante una migración explícita que conserve los cuatro valores previos y añada el nuevo.
Si el CHECK permanece antiguo, la actualización automática fallará al persistir NO_REALIZADA.
No se proporcionó ni ejecutó un borrado/recreación del esquema como solución.

## Pendientes de verificación

- Compilar/tipar backend y frontend, revisar visualmente los formularios y badges.
- Crear normal antes/exactamente/después del límite de 24 horas; edición sin nueva restricción.
- Crear reserva antes/exactamente/después del cierre de 2 horas, incluida medianoche en Lima.
- Plan con una experiencia cerrada: resumen, rollback integral y reintento idempotente.
- Reserva creada antes del cierre: pago/confirmación posteriores sin alterar pagos simulados.
- Dos operaciones concurrentes sobre cupos/plazo y edición de fase 1.
- Salida sin reservas o con todas canceladas: NO_REALIZADA y conservación del historial.
- Salida con PENDIENTE/CONFIRMADA: inicio y finalización anteriores.
- Competencia entre scheduler, cancelación administrativa y reprogramación bajo bloqueo.
- Nuevo estado en Historial, filtros, Hoy y detalle; ausencia de acciones inválidas.
- Compatibilidad del CHECK de PostgreSQL y de la versión anterior de la aplicación:
  una versión antigua no puede leer NO_REALIZADA mediante su enum antiguo.
- Regresión de DEMO, sus excepciones, limpieza y Live, sin cambios funcionales.

## Revisión estática y archivos

Los analizadores locales de TypeScript y Angular no detectaron errores de sintaxis
en las fuentes modificadas, incluidas las plantillas externas y la plantilla inline
de salidas.ts. No se realizó compilación, comprobación de tipos ni ejecución de pruebas.

Archivos creados o modificados:

- docs/salidas-fase-2.md
- seatour-frontend-angular/src/app/components/admin-salidas/admin-salidas.html
- seatour-frontend-angular/src/app/components/admin-salidas/admin-salidas.ts
- seatour-frontend-angular/src/app/components/dashboard-cliente/recomendaciones/recomendaciones.html
- seatour-frontend-angular/src/app/components/dashboard-cliente/recomendaciones/recomendaciones.ts
- seatour-frontend-angular/src/app/components/dashboard-cliente/recomendaciones/reserva-plan.html
- seatour-frontend-angular/src/app/components/dashboard-cliente/recomendaciones/reserva-plan.ts
- seatour-frontend-angular/src/app/components/operador-hoy/operador-hoy.ts
- seatour-frontend-angular/src/app/components/operador-mis-salidas/operador-mis-salidas.html
- seatour-frontend-angular/src/app/components/operador-mis-salidas/operador-mis-salidas.ts
- seatour-frontend-angular/src/app/components/operador-salida-detalle/operador-salida-detalle.html
- seatour-frontend-angular/src/app/components/operador-salida-detalle/operador-salida-detalle.ts
- seatour-frontend-angular/src/app/components/reservas/reservar.html
- seatour-frontend-angular/src/app/components/reservas/reservar.ts
- seatour-frontend-angular/src/app/components/reservas/reservas-lista.ts
- seatour-frontend-angular/src/app/components/reservas/salidas.ts
- seatour-frontend-angular/src/app/services/reservas.service.ts
- seatour-frontend-angular/src/app/services/salidas.service.ts
- src/main/java/com/seatour/seatour/controller/SalidaProgramadaController.java
- src/main/java/com/seatour/seatour/model/EstadoSalida.java
- src/main/java/com/seatour/seatour/repository/ReservaRepository.java
- src/main/java/com/seatour/seatour/service/ReservaService.java
- src/main/java/com/seatour/seatour/service/SalidaProgramadaService.java
- src/main/java/com/seatour/seatour/service/VentanaReservas.java

## Despliegue — 13 de octubre de 2026

Se amplió transaccionalmente salidas_programadas_estado_check para conservar PROGRAMADA,
EN_CURSO, COMPLETADA y CANCELADA y admitir NO_REALIZADA. Se confirmó su definición en PostgreSQL.
No se borraron filas ni se recrearon tablas o volúmenes.

La reconstrucción detectó una validación de 24 horas situada en guardar(), donde hora no
estaba definida y el retorno debía ser void. Se movió a validarFormulario(), conservando
el bypass DEMO. Backend y frontend compilaron después de la corrección.
Los tres contenedores quedaron healthy; frontend y API respondieron HTTP 200.
Se mantuvo el esquema de la fase 1. No se ejecutaron pruebas automatizadas de reservas
ni de concurrencia durante este despliegue.
