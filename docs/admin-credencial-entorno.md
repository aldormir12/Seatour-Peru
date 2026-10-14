# Credencial inicial ADMIN desde el entorno

AdminInicial usa SEATOUR_ADMIN_EMAIL y SEATOUR_ADMIN_PASSWORD únicamente para crear
la cuenta inicial cuando no existe ningún usuario con rol ADMIN.

- Si ya existe un ADMIN, incluso inactivo, termina sin leer ni validar estas credenciales,
  sin comparar hashes y sin actualizar la cuenta.
- Conserva la contraseña almacenada en PostgreSQL, identidad, rol, estado y preferencias.
- Para la creación inicial mantiene la validación de contraseña de 12 a 1024 caracteres,
  no vacía, y la validación de correo. Normaliza el correo, pero no la contraseña.
- El hash inicial se genera con el mismo PasswordEncoder PBKDF2 de PasswordConfig.
- Rechaza un correo ya registrado: no modifica ni promueve otra cuenta a ADMIN.
- Sin ambas variables no crea una cuenta; si solo falta una, rechaza la configuración.
- No registra contraseñas, hashes ni otras credenciales.

Cambiar la contraseña en .env después de crear el ADMIN no cambia su contraseña en
PostgreSQL. No se agrega un mecanismo nuevo de recuperación ni se modifica la lógica JWT.

## Historial del despliegue anterior — 13 de octubre de 2026

El despliegue anterior incluía sincronización de contraseña al arrancar. Se verificó
el login ADMIN sin mostrar credenciales y sin modificar .env. Este ajuste posterior
elimina esa sincronización automática; no se ha desplegado ni ejecutado para esta revisión.
La contraseña actual en PostgreSQL no se ha cambiado.
