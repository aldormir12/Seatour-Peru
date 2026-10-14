# Túnel original, login y SeaTour Live

La arquitectura original está restaurada en el código: navegador HTTPS -> Cloudflare Quick Tunnel -> cloudflared ejecutado en Windows -> http://localhost:8088 -> Nginx:80 -> backend:8080. Solo compose.yaml configura PostgreSQL, backend y frontend. No se añade un conector Docker, una red estática ni un puerto 8081.

iniciar-seatour.bat comprueba Docker y cloudflared en PATH, ejecuta docker compose up -d sin build, abre la aplicación local y lanza cloudflared tunnel --url http://localhost:8088. Conserva la extracción del enlace de los logs, su copia al portapapeles y la ventana que mantiene el proceso. Si se cambia SEATOUR_PORT, hay que ajustar también el destino del launcher. Un Quick Tunnel puede generar un enlace distinto al iniciarse de nuevo.

Se retiraron compose.tunnel.yaml, nginx-tunnel.conf, tools/iniciar-tunel.ps1 y la copia del origen privado en el Dockerfile. Se restauraron los headers originales de Nginx, incluidos Host, X-Forwarded-Host, X-Forwarded-Proto y X-Forwarded-For. Spring conserva forward-headers-strategy framework. PostgreSQL y backend no publican puertos; los volúmenes originales permanecen intactos.

La IP del host/túnel puede estar compartida por muchos visitantes. El bloqueo por IP está desactivado y las cabeceras no intervienen en las decisiones de bloqueo de login. Se conservan los cinco fallos consecutivos por cuenta y el bloqueo persistente de 15 minutos, con limpieza automática. No se necesita demostrar la IP pública para autenticar a un usuario.

SeaTour Live mantiene su flujo: el navegador solicita el token a /api/live/salidas/{id}/token y conecta directamente a LIVEKIT_URL. El backend consulta participantes en la API HTTPS de LiveKit. El túnel SeaTour no transporta las pistas de video/audio. Los límites de login se aplican solamente en POST /api/auth/login y no a /api/live/**. No se alteran rooms, tokens, permisos, cámara, micrófono, desconexión DEMO ni sesiones JWT ya emitidas.

La reversión solo modifica archivos. No se ejecutó el launcher, no se inició un túnel, no se reconstruyeron imágenes ni se modificaron servicios o redes Docker en ejecución. No se verificó conectividad en esta tarea. Queda pendiente desplegar y comprobar acceso externo HTTPS, login, transmisión LiveKit y comportamiento DEMO con autorización para hacerlo.
