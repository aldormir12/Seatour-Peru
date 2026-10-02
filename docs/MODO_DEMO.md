# Modo Demo

## Validaciones revisadas antes del bypass

La creación real usa `SalidaProgramadaService.crear`, `validarDatos`,
`cargarAsignacion`, `validarSolapamientos` y `asignarOperador`.
El inicio real usa `cambiarEstadoAutorizado` y `cambiarEstado`.

| Validación existente | Creación demo | Inicio demo |
| --- | --- | --- |
| Fecha y hora obligatorias, IDs positivos | Se conserva | Se conserva |
| Fecha/hora futura y horizonte máximo de 45 días | Se omite | No se aplica originalmente |
| Inicio entre 06:00 y 19:00, America/Lima | Se omite | No se aplica originalmente |
| Tour y embarcación existentes y activos; duración y capacidad válidas | Se conserva | Se conserva |
| Operador existente, activo y con rol OPERADOR | Se conserva | No se agrega una validación nueva |
| Solapamiento de embarcación, incluido buffer de 60 minutos | Se omite | Se omite |
| Solapamiento de horario del operador | Se omite | No se aplica originalmente |
| Pasajeros reservados mayores que cero | No se aplica originalmente | Se omite |
| No iniciar antes del horario ni después del intervalo programado | No se aplica originalmente | Se omite |
| Otra salida EN_CURSO usando la embarcación | No se aplica originalmente | Se omite |
| Autenticación, roles, propiedad del operador y transiciones válidas | Se conserva | Se conserva |
| Compatibilidad de cupos/reservas con capacidad | Se conserva | Se conserva |

Edición, cambio de embarcación, cancelación, eliminación y cierre conservan
sus validaciones. El cierre mantiene la hora prevista de finalización.

## Uso y aislamiento

- ADMIN activa/desactiva desde el botón global **Modo Demo**, con confirmación.
- El modal enumera las restricciones que se omiten y las que se conservan.
- Mientras está activo se muestra **MODO DEMO ACTIVO**, incluso al navegar.
- El estado se consulta al abrir ADMIN y periódicamente; no se guarda en localStorage.
- El backend arranca con el modo desactivado. La activación dura hasta desactivarlo
  o reiniciar ese backend.
- Las nuevas salidas creadas mientras está activo se guardan con `esDemo = true`.
  La marca queda persistida y no puede convertirse en una salida normal mediante edición.
- `esDemo` en la solicitud comunica la intención del formulario: una creación demo
  pendiente se rechaza si ya se desactivó. No autoriza por sí mismo ningún bypass.
- Solo ADMIN ve la lista separada `/api/salidas/demo`; incluye el botón **Iniciar Demo**.
- Las salidas demo se excluyen siempre de Activas, Historial, métricas normales,
  disponibilidad, Intelligence y recomendaciones normales.
- ADMIN configura y asigna operador. Mientras el modo está activo, el OPERADOR
  asignado puede ver su salida demo, iniciar sin pasajeros ni esperar el horario,
  completar conservando la validación de cierre y transmitir en SeaTour Live.
  Otros operadores no pueden consultar ni operar esa salida.
- CLIENTE solo ve la salida demo en SeaTour Live si está EN_CURSO y la comprobación
  existente confirma video real activo del operador asignado. Solicitar un token
  demo por ID tampoco permite entrar sin esa transmisión.
- No se permiten reservas reales para una salida demo. El aislamiento usa consultas
  específicas para operador y Live; no modifica LiveKit, sus rooms ni sus permisos.
- Desactivar oculta las salidas demo y bloquea sus acciones por ID, incluido Live.
  Los paneles del operador y la lista del cliente se refrescan cada cinco segundos;
  el detalle demo desaparece al recibir 404/403 y libera su panel Live mediante el
  ciclo de vida existente. No se eliminan datos.
- El inicio/cierre automático ignora salidas demo, incluso cuando el modo está activo.
- Desactivar espera a que terminen las solicitudes de salidas y Live ya en curso; después
  no se permiten acciones demo nuevas.

## Revisión

Revisión estática de permisos, consultas, llamadas y diff. No se ejecutaron build
ni tests, conforme a la solicitud.
