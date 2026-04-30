# Backend

El backend está implementado con FastAPI y organiza la lógica por routers y utilidades.

## Estructura principal

- `app/main.py`: arranque de la aplicación, CORS, routers y migraciones ligeras.
- `app/models.py`: modelos SQLAlchemy.
- `app/schemas.py`: esquemas Pydantic.
- `app/security.py`: hashing, tokens y utilidades de seguridad.
- `app/routers/`: endpoints agrupados por dominio.
- `app/utils/`: funciones auxiliares para Excel, correo, periodos y mappings.

## Routers

### `auth`

Gestiona login, recuperación de contraseña y el registro en dos pasos del alumno.

### `alumnos`

Gestiona pre-registro, alta, importación Excel, rotaciones, asistencia y consulta del perfil del alumno.

### `admin`

Ofrece CRUD y operaciones globales: profesores, alumnos, centros, estadísticas, plantillas y exportaciones.

### `profesores`

Expone el seguimiento del alumnado asignado, asistencia y evaluación.

### `cuadernillos`

Sirve la estructura de las rúbricas, los PDFs y los datos relacionados con cuadernillos.

## Seguridad y comportamiento relevante

- Las contraseñas se guardan con hashing Argon2, no en texto plano.
- La sesión se firma con JWT y se valida contra `SECRET_KEY`, `ALGORITHM` y el tiempo de expiración configurado.
- Los alumnos con `registro_completado = False` no pueden iniciar sesión hasta terminar el alta.
- El sistema aplica bloqueo temporal por intentos fallidos de acceso.
- La API aplica rate limiting en los puntos sensibles.
- Los datos sensibles del alumno se cifran con AES-256-GCM antes de guardarlos en base de datos.
- El cifrado depende de `MASTER_ENCRYPTION_KEY`, que debe tener 32 bytes para AES-256.
- Se mantiene trazabilidad histórica con estados activos/inactivos en lugar de borrar siempre físicamente.

## Datos cifrados

- `Alumno.nombre_cifrado`
- `Alumno.apellidos_cifrado`
- `Alumno.email_cifrado`

Estos valores se descifran solo cuando el backend necesita mostrarlos en una vista o exportación autorizada.

## Variables de entorno de seguridad

- `SECRET_KEY`: clave para firmar y validar JWT.
- `ALGORITHM`: algoritmo de firma del token, normalmente `HS256`.
- `ACCESS_TOKEN_EXPIRE_MINUTES`: duración de la sesión.
- `MASTER_ENCRYPTION_KEY`: clave maestra para AES-GCM.

Los valores por defecto que aparecen en el código deben tratarse como fallback de desarrollo. En producción, estas variables deben definirse explícitamente en el entorno.

## Utilidades destacadas

- Envío de correos para invitaciones, avisos y recuperación.
- Exportación e importación de Excel.
- Normalización de periodos académicos.
- Gestión de JSON de especialidades y plantillas globales.