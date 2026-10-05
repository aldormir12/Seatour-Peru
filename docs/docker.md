# SeaTour en Docker y Cloudflare Quick Tunnel

La entrada única es `http://localhost:8088` (configurable con `SEATOUR_PORT`).
Nginx sirve Angular y envía `/api` a Spring Boot conservando la ruta y los
parámetros. Spring Boot se conecta a `postgres:5432` por la red de Compose.
PostgreSQL y Spring Boot no publican puertos en el host.

El puerto de Nginx se vincula a `127.0.0.1`: funciona desde localhost y desde
`cloudflared` ejecutado en el mismo equipo. No se necesita CORS entre el frontend
y la API porque ambos comparten origen. La configuración del backend admite
los orígenes localhost del puerto elegido y los dominios de Quick Tunnel.
Nginx conserva el host externo y el protocolo HTTPS comunicado por Cloudflare;
Spring procesa esas cabeceras solo en la configuración de Compose.

## Preparación

Requiere Docker Desktop con contenedores Linux y Docker Compose v2.

1. Copia `.env.example` a `.env` sin sobrescribir un archivo existente.
2. Define `SPRING_DATASOURCE_PASSWORD` y `SEATOUR_JWT_SECRET`. El secreto JWT
   debe estar en Base64 y contener al menos 32 bytes aleatorios.
3. Para crear el primer administrador en la base vacía, define ambas variables
   `SEATOUR_ADMIN_EMAIL` y `SEATOUR_ADMIN_PASSWORD` o deja ambas sin definir.
   Se conserva la política ADMIN existente, con mínimo 12 caracteres.

`.env` está excluido de Git y de los contextos de build. Los secretos se
inyectan al arrancar; no se incluyen en las imágenes. El archivo `.env` lo
lee Compose, mientras que la ejecución local continúa utilizando las variables
del entorno como antes.

## Comandos para ejecutar cuando se autorice el build

Desde la raíz del repositorio:

```powershell
docker compose up -d --build --wait
```

Compose espera a que PostgreSQL esté listo antes de arrancar Spring, y espera
la respuesta de `/api/tours` antes de arrancar Nginx. La imagen de Spring omite
compilación y ejecución de pruebas durante su empaquetado.

Abre `http://localhost:8088`. Para el túnel, en otra terminal del mismo equipo:

```powershell
cloudflared tunnel --url http://localhost:8088
```

Abre el enlace HTTPS `trycloudflare.com` generado. Si cambias `SEATOUR_PORT`,
cambia también el puerto del comando de Cloudflare.

Para consultar logs o detener los contenedores conservando datos:

```powershell
docker compose logs -f
docker compose down
```

## Persistencia y ejecución local

- `postgres_data` conserva la base y `uploads_data` las imágenes subidas.
- PostgreSQL Docker crea una base vacía independiente de la PostgreSQL local y
  de H2. No copia ni modifica sus datos. Hibernate mantiene `ddl-auto=update`.
- La contraseña de PostgreSQL se aplica al inicializar el volumen por primera
  vez. Cambiar `.env` posteriormente no modifica la contraseña de una base existente.
- El puerto 8088 evita conflictos con el backend local 8080 y los frontends
  actuales 4200/4300. `iniciar-seatour.bat` permanece sin modificaciones: todavía
  inicia la ejecución local y apunta Cloudflare a 4300.
- La configuración Angular `docker` compila solo el navegador para Nginx.
  `production` conserva su configuración SSR y `npm start` conserva su proxy local.
  Las rutas de Angular pueden abrirse directamente gracias al fallback a `index.html`;
  las respuestas de error de `/api` se devuelven sin sustituirlas por ese HTML.
- La siguiente adaptación del launcher deberá ejecutar Compose y apuntar
  Cloudflare al puerto único, después de confirmar que la app está disponible.

## Servicios externos

LiveKit y SMTP siguen siendo opcionales y no se incluyen en este Compose.
Configura sus variables en `.env` si los usas. `LIVEKIT_URL` debe ser una dirección
accesible desde el navegador, incluido el teléfono; el Quick Tunnel HTTP de
SeaTour no publica el servidor LiveKit. Para SMTP del equipo host desde Docker
Desktop puede utilizarse `host.docker.internal`; `localhost` dentro del backend
designa el propio contenedor.

Los recursos en `public` se copian durante el build, incluido el video de portada
si existe en el equipo. Las imágenes antiguas de `uploads` no se importan al volumen.

Referencias: [compatibilidad de Angular y Node](https://angular.dev/reference/versions),
[orden de arranque de Compose](https://docs.docker.com/compose/how-tos/startup-order)
y [proxy HTTP de Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

No se han ejecutado builds, pruebas, contenedores ni túneles para verificar esta configuración.
