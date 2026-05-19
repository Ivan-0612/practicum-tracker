# Modelo de datos

El sistema gira alrededor de unas pocas entidades principales que conectan usuarios, rotaciones, asistencia y evaluación.

## Entidades principales

### `Usuario`

Cuenta de acceso con rol, estado activo, tipo de tutor y flags de registro.

### `Alumno`

Perfil académico del estudiante, con datos cifrados y relación uno a uno con usuario.

Campos cifrados:

- `nombre_cifrado`
- `apellidos_cifrado`
- `email_cifrado`

Estos datos se protegen para minimizar exposición de información personal sensible.

### `Especialidad`

Define la especialidad y el JSON de cuadernillo asociado.

### `CentroPracticas`

Relaciona un centro con un tutor hospital y un tutor universidad por defecto.

### `Rotacion`

Unidad académica principal. Guarda alumno, especialidad, curso, rotación, periodo, centro y estado de cierre.

### `AsignacionTutor`

Vincula un tutor con una rotación y distingue el tipo de tutor.

### `CuadernilloRespuesta`

Persistencia del borrador o evaluación en formato JSON.

### `RegistroAsistencia`

Firma de asistencia por día, alumno y rotación.

Incluye `fecha_recuperada` para marcar asistencias recuperadas en otro día.

### `InvitacionTutorCampo`

Token de invitación que el alumno genera y comparte con el enfermero del hospital. Vinculado a una rotación concreta.

Campos relevantes:

- `token`: cadena aleatoria única que forma parte de la URL pública.
- `usado`: se marca `true` en cuanto el enfermero completa su registro, bloqueando cualquier intento posterior.
- `expira_at`: fecha límite de uso, fijada a 7 días desde la generación. Si caduca, el alumno puede generar uno nuevo y el anterior se invalida automáticamente.

### `PlantillaExcelMappingGlobal`

Mapping global para exportaciones Excel.

### `UnidadesCompetenciaGlobal`

Estructura base de unidades de competencia y niveles.

## Relaciones importantes

- Un usuario puede tener un perfil de alumno.
- Un alumno puede tener varias rotaciones.
- Una rotación puede tener varios tutores.
- Una rotación puede tener asistencia y evaluación.
- Una rotación puede tener como máximo una invitación de tutor de campo activa en cada momento.

## Reglas relevantes

- Los registros deben conservar trazabilidad histórica.
- La asistencia evita duplicados por alumno, rotación y fecha.
- Los centros tienen tutores asignados por defecto.
- El estado de evaluación y finalización de rotación se conserva para exportación e informes.