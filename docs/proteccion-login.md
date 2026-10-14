# Protección de inicio de sesión

POST /api/auth/login conserva AuthenticationManager, PBKDF2 y JWT. ADMIN, OPERADOR, CLIENTE y los correos inexistentes usan la misma protección y respuestas genéricas. El correo se normaliza con trim y minúsculas (Locale.ROOT).

## Reglas por cuenta

Cinco fallos consecutivos bloquean nuevos inicios de sesión durante 15 minutos; el quinto responde HTTP 429. Durante ese plazo tampoco se admite la contraseña correcta. Un éxito reinicia el contador. Al vencer el bloqueo, el siguiente intento lo reinicia antes de autenticar. Las peticiones bloqueadas no prolongan el vencimiento. Angular conserva su mensaje genérico y el diseño existente. Retry-After es 900 segundos, un plazo conservador.

## IP desactivada

El mecanismo original ejecuta cloudflared en Windows contra localhost:8088. Nginx puede ver una dirección compartida del host/gateway en vez de la de cada visitante. Por eso se retiró el contador de IP del flujo de autenticación y su resolución de cabeceras. No se crean ni consultan registros ip: para decidir accesos. Los registros de IP anteriores no afectan a ningún usuario y serán retirados por la limpieza cuando cumplan su retención.

No se confía en CF-Connecting-IP o X-Forwarded-For para decisiones de bloqueo de login. No existe bloqueo global por IP, servicio adicional, puerto privado ni red nueva. Las cabeceras de proxy originales se conservan para los demás flujos. La protección por cuenta no puede eludirse cambiando IP; sí queda fuera de alcance el control de ataques distribuidos contra muchos correos distintos.

## Persistencia, concurrencia y limpieza

Se conserva intentos_login: clave, fallos, bloqueado_hasta, ventana_desde, ultimo_intento y el índice de actividad. La clave de cuenta es SHA-256 del correo normalizado; es un seudónimo, no cifrado ni anonimización irreversible. No se eliminan columnas, índices ni datos mediante esta reversión.

La creación atómica INSERT ... ON CONFLICT DO NOTHING y PESSIMISTIC_WRITE serializan intentos sobre la misma cuenta. AuthenticationException no revierte los contadores; UsuarioDetailsService mantiene noRollbackFor para UsernameNotFoundException. Errores inesperados de infraestructura hacen rollback y no emiten JWT. El bloqueo persiste al reiniciar mientras se conserve PostgreSQL y sus volúmenes.

LimpiezaIntentosLoginService continúa ejecutándose cada cinco minutos, empezando cinco minutos tras arrancar. Borra hasta 1000 registros por lote con más de 30 días sin actividad y sin bloqueo vigente, usando FOR UPDATE SKIP LOCKED. Conserva los contadores de 1 a 4 fallos de cuentas existentes para respetar los fallos consecutivos. Elimina registros inactivos de IP, cuentas inexistentes, cuentas con contador cero o bloqueo vencido. No elimina usuarios ni datos de negocio. Las filas anteriores usan ventana_desde cuando ultimo_intento sea null.

Si la limpieza elimina una fila entre la creación y el bloqueo, el login reintenta obtenerla. La limpieza y el esquema existentes permanecen sin cambios.

## Pendiente de verificar

Despliegue autorizado, esquema de PostgreSQL, quinto fallo y expiración exacta, éxito, los tres roles, correos inexistentes y peticiones simultáneas con limpieza. El SQL nativo es de PostgreSQL; H2 requiere adaptación. La retención limita registros inactivos, no ataques que mantengan muchas claves activas.

No se ejecutaron builds, pruebas, SQL ni Docker durante la reversión. No se cambiaron JWT, contraseñas, .env, DEMO, Live, reservas, salidas, pagos o reprogramaciones.
