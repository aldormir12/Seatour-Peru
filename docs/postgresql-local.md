# PostgreSQL local

El datasource principal utiliza PostgreSQL. La base `seatour_db` y el usuario
`seatour_user` deben existir en `localhost:5432`. El usuario debe tener permisos
para crear y modificar las tablas en el esquema utilizado por la aplicación.

Configura las variables en la misma sesión de PowerShell desde la que iniciarás
SeaTour:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:5432/seatour_db'
$env:SPRING_DATASOURCE_USERNAME = 'seatour_user'
$credencialSeatour = Get-Credential -UserName 'seatour_user' -Message 'Contraseña de PostgreSQL para SeaTour'
$env:SPRING_DATASOURCE_PASSWORD = $credencialSeatour.GetNetworkCredential().Password
Remove-Variable credencialSeatour
```

La URL y el usuario tienen esos valores locales por defecto. La contraseña no
tiene valor por defecto y no se guarda en archivos. La variable `SEATOUR_JWT_SECRET`
sigue siendo necesaria según la configuración existente.

Se conserva `spring.jpa.hibernate.ddl-auto=update`: al iniciar contra la base
vacía, Hibernate crea las tablas del modelo. No se importan ni eliminan archivos
o datos de H2. No se cambian entidades, relaciones ni lógica de negocio.

## Compatibilidad del modelo

- `GenerationType.IDENTITY` se conserva; Hibernate utiliza la generación de
  identificadores de PostgreSQL mediante su dialecto detectado desde JDBC.
- Los campos `@Lob` de `ComprobanteReserva` (`html`, `texto`, `qr`) se conservan.
  En PostgreSQL, Hibernate utiliza large objects referenciados mediante OID;
  no son columnas `text` ni `bytea`. Su escritura ocurre en la transacción de
  `ComprobanteReservaService.preparar`, y su lectura para correo en la de
  `CorreoReservaJob.enviarPendientes`. Estos accesos ya son transaccionales,
  como requiere el driver. Cualquier acceso futuro debe mantener esa condición.
- La definición `boolean default false` de las salidas es compatible con PostgreSQL.

Referencias: [Hibernate](https://docs.jboss.org/hibernate/orm/6.4/introduction/html_single/Hibernate_Introduction.html)
y [pgJDBC: datos binarios y large objects](https://jdbc.postgresql.org/documentation/binary-data/).

H2 queda como dependencia exclusiva de pruebas. El perfil `test` mantiene su URL,
driver y credenciales propios. La consola H2 principal está deshabilitada y su
dependencia se retiró.

Esta configuración no se ha verificado mediante arranque, build ni pruebas.
