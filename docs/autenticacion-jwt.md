# Autenticacion JWT de SeaTour

Se usa `org.springframework.security:spring-security-oauth2-jose`, con Nimbus JOSE + JWT y versiones gestionadas por Spring Boot. Los tokens se firman con HS256; el verificador acepta exclusivamente ese algoritmo.

## Configuracion

| Variable de entorno | Propiedad | Valor predeterminado |
| --- | --- | --- |
| `SEATOUR_JWT_SECRET` | `seatour.jwt.secret` | Obligatorio: Base64 de al menos 32 bytes aleatorios |
| `SEATOUR_JWT_EXPIRATION_SECONDS` | `seatour.jwt.expiration-seconds` | `3600` (una hora) |
| `SEATOUR_JWT_ISSUER` | `seatour.jwt.issuer` | `seatour` |

Ejemplo para generar un secreto local en PowerShell y ejecutar la aplicacion desde esa misma terminal:

```powershell
$jwtKey = New-Object byte[] 32
$jwtRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$jwtRng.GetBytes($jwtKey)
$jwtRng.Dispose()
$env:SEATOUR_JWT_SECRET = [Convert]::ToBase64String($jwtKey)
.\mvnw.cmd spring-boot:run
```

Conservar el secreto en la configuracion privada del entorno si los tokens deben seguir siendo validos tras reiniciar. Cambiarlo invalida los tokens anteriores. No hay secreto de respaldo en produccion; una configuracion ausente o invalida impide arrancar. El perfil `test` usa una clave publica de fixture, ubicada exclusivamente en recursos de pruebas.

## Login y peticiones

`POST /api/auth/login`, con `Content-Type: application/json`:

```json
{"correo":"ana@example.com","password":"tu clave"}
```

Respuesta `200`:

```json
{"id":1,"nombre":"Ana","correo":"ana@example.com","rol":"CLIENTE","token":"<JWT>"}
```

Enviar el token en cada peticion protegida mediante `Authorization: Bearer <JWT>`. El login no crea una sesion HTTP. El password y su hash no aparecen en la respuesta ni en los claims.

| Claim | Contenido |
| --- | --- |
| `sub` | Correo normalizado |
| `userId` | ID numerico del usuario |
| `rol` | `CLIENTE`, `OPERADOR` o `ADMIN` al emitir el token |
| `iss` | Emisor configurado |
| `iat` | Fecha de emision, NumericDate |
| `exp` | Fecha de expiracion, NumericDate |

El filtro verifica firma, algoritmo, emisor y expiracion, sin margen adicional despues de expirar. Carga el usuario actual por correo, comprueba que su ID coincida y que siga activo. Las autoridades `ROLE_*` se obtienen del rol vigente en la base de datos: el claim no permite conservar permisos anteriores a un cambio de rol.

## Seguridad y errores

`SecurityConfig` conserva `STATELESS`, desactiva el cache de peticiones e incorpora el filtro JWT antes de `UsernamePasswordAuthenticationFilter`. La autorizacion se concentra en `authorizeHttpRequests`, con `hasRole` / `hasAnyRole` y autoridades `ROLE_*`; los controllers no comprueban roles manualmente.

Sin token, las rutas publicas siguen disponibles y las protegidas responden `401`. Un encabezado de autenticacion invalido, token malformado, firma incorrecta o token expirado devuelve `401`, incluso en rutas publicas. La respuesta generica es `{"mensaje":"No autorizado"}`, con `WWW-Authenticate: Bearer`; no incluye excepciones internas. Un login incorrecto mantiene `{"mensaje":"Credenciales invalidas"}`.

Con JWT valido pero sin el rol requerido, la respuesta es `403` y `{"mensaje":"Acceso denegado"}`. Sin autenticacion valida se mantiene `401`. El rol vigente se consulta en cada peticion, de modo que un cambio de rol afecta incluso a tokens emitidos anteriormente.

| Ruta / operacion | Visitante | CLIENTE | OPERADOR | ADMIN |
| --- | --- | --- | --- | --- |
| `POST /api/auth/login`, `POST /api/usuarios` (registro) | Si | Si | Si | Si |
| `GET` / `HEAD` de `/api/tours/**`, `/api/categorias/**`, `/api/salidas/**` (incluye disponibles) | Si | Si | Si | Si |
| Otros metodos en tours, categorias y salidas | 401 | 403 | Si | Si |
| `/api/embarcaciones/**` (todos los metodos) | 401 | 403 | Si | Si |
| `/api/usuarios/**`, excepto el registro exacto | 401 | 403 | 403 | Si |
| Otras rutas | 401 | Autenticado | Autenticado | Autenticado |

Se conserva la excepcion existente de `/h2-console/**` para desarrollo. La tabla define permisos, no crea endpoints nuevos: actualmente no hay controller de embarcaciones, DELETE de tours ni PUT/DELETE de categorias. Las reglas los cubren para cuando se implementen. Las operaciones actuales de usuarios son listado y detalle, ahora solo para ADMIN.

No hay refresh tokens, blacklist, almacenamiento de JWT, cambios en Angular ni en reservas.

## Pruebas

```powershell
.\mvnw.cmd test "-Dspring.datasource.url=jdbc:h2:mem:seatour-tests;DB_CLOSE_DELAY=-1"
```

Las pruebas de autenticacion usan un endpoint protegido exclusivo de pruebas y la cadena real de Spring Security. Comprueban login, claims, rol, firma, expiracion, usuarios eliminados/inactivos/recreados, respuestas sin password, acceso publico y ausencia de sesion o autenticacion persistida entre peticiones.

`AutorizacionIntegrationTest` verifica la matriz con JWT emitidos por el login y usuarios reales en H2. Aisla los servicios operativos mediante mocks para comprobar acceso a los controllers y ausencia de invocaciones cuando se deniega acceso. Para embarcaciones usa un endpoint exclusivo de pruebas, que comprueba la regla de seguridad sin simular la existencia de una API productiva. Las pruebas previas de listado/detalle de usuarios ahora presentan JWT de ADMIN.
