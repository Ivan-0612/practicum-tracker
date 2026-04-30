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

- El login bloquea a los alumnos con registro pendiente.
- Se registra el estado activo o inactivo para mantener trazabilidad histórica.
- La asistencia y la evaluación se relacionan con tutorías específicas.
- La API aplica rate limiting en los puntos sensibles.

## Utilidades destacadas

- Envío de correos para invitaciones, avisos y recuperación.
- Exportación e importación de Excel.
- Normalización de periodos académicos.
- Gestión de JSON de especialidades y plantillas globales.