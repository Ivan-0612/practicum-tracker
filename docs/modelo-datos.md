# Modelo de datos

El sistema gira alrededor de unas pocas entidades principales que conectan usuarios, rotaciones, asistencia y evaluación.

## Entidades principales

### `Usuario`

Cuenta de acceso con rol, estado activo, tipo de tutor y flags de registro.

### `Alumno`

Perfil académico del estudiante, con datos cifrados y relación uno a uno con usuario.

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

### `PlantillaExcelMappingGlobal`

Mapping global para exportaciones Excel.

### `UnidadesCompetenciaGlobal`

Estructura base de unidades de competencia y niveles.

## Relaciones importantes

- Un usuario puede tener un perfil de alumno.
- Un alumno puede tener varias rotaciones.
- Una rotación puede tener varios tutores.
- Una rotación puede tener asistencia y evaluación.

## Reglas relevantes

- Los registros deben conservar trazabilidad histórica.
- La asistencia evita duplicados por alumno, rotación y fecha.
- Los centros tienen tutores asignados por defecto.
- El estado de evaluación y finalización de rotación se conserva para exportación e informes.