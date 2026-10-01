# Confirmacion de reserva: QR y correo

## Flujo

POST /api/reservas/{id}/pagos mantiene su contrato y autorizacion CLIENTE propietario.
Solo un pago APROBADO que confirma la reserva crea el comprobante; los pagos rechazados
no generan QR ni correo. La confirmacion administrativa existente no envia este correo.

Pago, confirmacion, codigo, PNG y mensaje pendiente se guardan en la misma transaccion.
El destinatario se obtiene del correo del propietario autenticado en base de datos,
nunca de un campo recibido en el pago. Se conserva una copia de los detalles al pagar.
No se modifican los contratos de respuesta ni el frontend.

ComprobanteReserva (tabla comprobantes_reserva) tiene una relacion unica con Reserva,
un codigo unico ST- seguido de UUID aleatorio sin guiones, PNG, destinatario,
texto/HTML, creadoEn, enviadoEn, omitidoEn, intentos y proximoIntento.
El QR contiene exclusivamente SEATOUR:RESERVA:v1:<codigo>; no incluye email, nombre,
documentos, informacion de pago ni IDs secuenciales. No usa servicios QR externos.

El correo incluye tour, fecha, hora de Peru, embarcacion, pasajeros y categorias,
adicionales, total pagado, codigo y QR integrado y adjunto. Indica presentarlo al embarcar.
El HTML escapa todos los datos dinamicos y ofrece alternativa de texto plano.

## Configuracion SMTP

Configurar en el entorno del backend y reiniciar (sin versionar credenciales):

- SEATOUR_CORREO_HABILITADO=true
- SEATOUR_CORREO_REMITENTE=remitente autorizado por tu proveedor
- SEATOUR_SMTP_HOST=servidor SMTP de tu proveedor
- SEATOUR_SMTP_PORT=587
- SEATOUR_SMTP_USUARIO=usuario SMTP
- SEATOUR_SMTP_PASSWORD=credencial SMTP
- SEATOUR_SMTP_AUTH=true
- SEATOUR_SMTP_STARTTLS=true

Por defecto el envio esta deshabilitado: se generan comprobantes y permanecen pendientes,
no se simula un envio exitoso. Al habilitar SMTP se procesan los pendientes.
Para un servidor SMTP local de desarrollo sin autenticacion/TLS, ajustar HOST y PORT,
AUTH=false y STARTTLS=false. No deshabilitar TLS para un proveedor remoto.

El job consulta cada 15 segundos hasta 5 pendientes con bloqueo exclusivo.
Solo puede leer pagos ya confirmados en base de datos. Un fallo SMTP no revierte el pago;
se reintenta con espera creciente de 1 minuto hasta 1 hora. Una reserva que ya no este
CONFIRMADA se omite. enviadoEn indica aceptacion SMTP, no entrega garantizada al buzon.
Si el proceso cae despues de aceptar SMTP y antes de guardar enviadoEn, puede repetirse
el correo: SMTP no permite garantizar exactamente una entrega. Se reutilizan codigo y QR.

## Validacion futura al embarcar

No se crea aun un endpoint de embarque. findByCodigo permite localizar la relacion
persistida. Una futura validacion debe exigir un operador autenticado, comprobar el
prefijo/version, buscar el codigo y revisar el estado actual CONFIRMADA, salida y pago;
no debe aceptar un QR por su apariencia ni aceptar reservas canceladas. El codigo es
una credencial aleatoria de acceso, debe tratarse como privado. No se registra en logs.
No se marcan pasajeros embarcados en este cambio.

No hay envio retroactivo para pagos anteriores a esta implementacion.
No se ejecutaron pruebas ni builds, por instruccion del usuario.

Dependencias: spring-boot-starter-mail y ZXing core 3.5.4.
Referencias: https://docs.spring.io/spring-framework/reference/integration/email.html
https://zxing.github.io/zxing/apidocs/com/google/zxing/qrcode/QRCodeWriter.html

## Diagnostico en Windows

Las variables permanentes solo son heredadas por procesos nuevos. Tras configurarlas,
cierra y abre el IDE/terminal que inicia Java y reinicia el backend; el reinicio de
DevTools dentro de la misma JVM no actualiza su entorno.
El arranque ahora informa Correo de reservas ACTIVO/INACTIVO y configuracion SMTP
sin imprimir credenciales. El job informa pendientes, aceptacion SMTP y tipos de fallo.
Gmail requiere una contrasena de aplicacion apropiada, no la contrasena normal.
Un comprobante con intentos=0 y proximoIntento vencido todavia no ha intentado SMTP;
no representa un rechazo de autenticacion. No hace falta pagar otra vez: los pendientes
se procesan al activar el job.
