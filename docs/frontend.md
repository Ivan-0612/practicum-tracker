# Frontend

El frontend está construido con Next.js y App Router. La interfaz se divide por tipo de usuario y por flujos concretos.

## Estructura

- `app/`: rutas de la aplicación.
- `components/`: modales y componentes reutilizables.
- `lib/`: utilidades compartidas.

## Rutas principales

### Público

- `/login`: inicio de sesión.
- `/registro`: registro de alumno en dos pasos.
- `/restablecer-password`: recuperación de contraseña.

### Administración

- `/admin/panel`: panel principal.
- `/admin/alumnos`: listado y gestión de alumnos.
- `/admin/alumnos/nuevo`: pre-registro de alumno.
- `/admin/alumnos/importar`: importación masiva desde Excel.
- `/admin/profesores`: gestión de profesores.
- `/admin/profesores/nuevo`: alta de profesor.
- `/admin/centros`: gestión de centros de prácticas.

### Alumno

- `/alumno/dashboard`: panel principal.
- `/alumno/asistencia/[id]`: calendario y firma de asistencia.
- `/alumno/evaluar/[id]`: formulario de evaluación.

### Profesorado

- `/profesor/dashboard`: vista del tutor.
- `/profesor/asistencia/[id]`: firma y consulta de asistencia.
- `/profesor/evaluar/[id]`: evaluación de la rotación.

## Componentes clave

- Modales para rubricas, rotaciones y tipos de alta.
- Formularios para alta de usuarios y gestión de centros.
- Vistas con filtros, exportación y acciones contextuales.

## Comportamiento funcional

El frontend no solo muestra datos: también dirige el flujo de negocio, como la creación de rotaciones, la invitación de tutor de campo y la exportación de informes.