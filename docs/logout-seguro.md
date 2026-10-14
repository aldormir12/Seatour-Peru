# Logout seguro

POST /api/auth/logout requiere el Bearer autenticado actual. Aplica a todos los roles mediante el filtro y permisos existentes. Tras comprobar firma y fechas se guarda la huella SHA-256 del token, con su firma Base64URL normalizada, y su vencimiento en tokens_revocados. No se guarda ni registra el JWT completo. La PK resuelve revocaciones simultáneas con ON CONFLICT DO NOTHING. La transacción se confirma antes del HTTP 204.

JwtService consulta la revocación en cada validación. Una petición posterior al cierre confirmado devuelve HTTP 401 con el mensaje genérico existente. No hay caché local que pueda ignorar el estado de PostgreSQL tras reiniciar Docker. La revocación corresponde al token específico, no a todas las sesiones del usuario. Los nuevos JWT incluyen jti aleatorio para distinguir sesiones generadas en el mismo segundo; issuer, firma, roles y duración no cambian. Los JWT anteriores sin jti siguen siendo válidos y revocables por su huella.

TokenRevocadoService elimina cada cinco minutos únicamente las entradas cuyo token ya venció. Hibernate incorpora tokens_revocados (huella y expira_en) y idx_tokens_revocados_expira con la configuración update existente. No se ejecutaron SQL ni cambios sobre la base o volúmenes en esta tarea.

Angular espera la respuesta antes de eliminar localStorage y navegar. Usa HttpBackend para enviar explícitamente el Bearer capturado, evitando recursión del interceptor. Un 401 se considera un token ya rechazado por el servidor. Un fallo de red/servidor o timeout mantiene la sesión local y avisa mediante una alerta genérica para reintentar; nunca afirma que el backend lo invalidó. Si el servidor confirmó pero se perdió la respuesta, el reintento obtendrá 401 y limpiará la sesión. Solicitudes de cierre simultáneas desde la misma instancia Angular comparten la operación. Una respuesta de una sesión anterior no borra un token nuevo.

La limpieza local por expiración, JWT ilegible o respuestas 401 se separa de logout para evitar peticiones recursivas. El botón explícito envía el token aunque el reloj del navegador lo considere vencido: la fecha del servidor decide. No se modificaron HTML/CSS, Cloudflare, Nginx, Docker, LiveKit, DEMO, reservas o pagos. Los JWT de LiveKit ya emitidos y transmisiones existentes conservan su comportamiento; esta revocación afecta al JWT SeaTour y las siguientes llamadas a su API.

## Verificación pendiente

- Crear tabla/índice al desplegar; logout en los tres roles, HTTP 204 y reutilización HTTP 401.
- Persistencia tras reinicio y limpieza solo después de expirar.
- Dos sesiones distintas, JWT anteriores, dos logout simultáneos y firmas Base64 equivalentes.
- Error de red, timeout, reintento, token vencido y nueva sesión mientras llega una respuesta antigua.
- Los tests existentes de Angular que usaban logout como limpieza síncrona deben adaptarse al contrato asíncrono y al request HTTP; ahora pueden usar limpiarSesionLocal para limpiar fixtures. No se modificaron ni ejecutaron tests.
- Inserción atómica de PostgreSQL: el perfil H2 necesita adaptación antes de ejecutar su suite.
- Una petición que pasó autenticación antes de la confirmación del cierre puede finalizar. No se cancelan operaciones de negocio ya iniciadas. Si el dispositivo está desconectado, el servidor no puede recibir el cierre: la UI indica el fallo en lugar de prometer revocación.

No se ejecutaron builds, pruebas ni Docker; no se hicieron commits ni pushes.
