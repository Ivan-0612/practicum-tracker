# Frontend

El frontend está construido con Next.js y App Router. La interfaz se divide por tipo de usuario y por flujos concretos.

## Estructura

- `app/`: rutas de la aplicación.
- `components/`: modales y componentes reutilizables.
- `lib/`: utilidades compartidas.

## Rutas principales

### Público

- `/login`: inicio de sesión. Incluye el flujo de recuperación de contraseña de forma inline (sin cambiar de página): al pulsar "¿Olvidaste tu contraseña?" la tarjeta cambia de modo y muestra un campo de email propio.
- `/registro`: registro de alumno en dos pasos.
- `/restablecer-password`: restablecimiento de contraseña desde un enlace de email.
- `/tutor-campo/registro`: página pública para que el tutor de campo se registre o se vincule a una rotación a partir de un enlace generado por el alumno. El flujo es de tres pasos: validación del token, introducción del email y (si la cuenta es nueva) creación de contraseña.

### Administración

- `/admin/panel`: panel principal.
- `/admin/alumnos`: listado y gestión de alumnos.
- `/admin/alumnos/nuevo`: pre-registro de alumno.
- `/admin/alumnos/importar`: importación masiva desde Excel.
- `/admin/profesores`: gestión de profesores.
- `/admin/profesores/nuevo`: alta de profesor.
- `/admin/centros`: gestión de centros de prácticas.

### Alumno

- `/alumno/dashboard`: panel principal. Incluye el modal de tutor de campo rediseñado: el alumno genera un enlace con un botón y lo copia al portapapeles para compartirlo, sin necesidad de introducir el correo del enfermero.
- `/alumno/asistencia/[id]`: calendario y firma de asistencia.
- `/alumno/evaluar/[id]`: vista de la rúbrica dividida en páginas (wizard). Mientras la evaluación está en curso muestra el bloque de calificaciones ocultas. Cuando está cerrada, muestra cada bloque en una página independiente con navegación Anterior/Siguiente.

### Profesorado

- `/profesor/dashboard`: vista del tutor.
- `/profesor/asistencia/[id]`: firma y consulta de asistencia.
- `/profesor/evaluar/[id]`: evaluación de la rotación dividida en páginas (wizard). Cada bloque de la rúbrica ocupa una página independiente. El botón de finalizar evaluación es visible en todas las páginas, no solo en la última.

## Componentes clave

- Modales para rubricas, rotaciones y tipos de alta.
- Formularios para alta de usuarios y gestión de centros.
- Vistas con filtros, exportación y acciones contextuales.

## Comportamiento funcional

El frontend no solo muestra datos: también dirige el flujo de negocio, como la creación de rotaciones, la invitación de tutor de campo y la exportación de informes.

## Patrones de UX aplicados

- **Wizard de evaluación**: los cuadernillos largos se dividen en páginas para evitar el scroll. El indicador de puntos es clicable y permite saltar directamente a cualquier sección.
- **Modo inline en login**: la recuperación de contraseña no navega a otra página, el formulario cambia de estado dentro de la misma tarjeta.
- **Enlace de invitación con copia al portapapeles**: el modal de tutor de campo muestra el enlace generado y un botón que copia al portapapeles con confirmación visual.