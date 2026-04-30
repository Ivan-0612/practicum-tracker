# Arquitectura general

Practicum Tracker está dividido en dos aplicaciones principales:

- Backend en FastAPI para autenticación, lógica de negocio y acceso a datos.
- Frontend en Next.js para la experiencia de usuario por roles.

## Capas

### Presentación

La capa de presentación vive en `frontend/` y contiene las pantallas públicas, de alumno, profesor y administración.

### API

La capa de API vive en `backend/app/` y expone endpoints REST bajo `/api/v1/...`.

### Persistencia

La persistencia se modela con SQLAlchemy sobre una base de datos PostgreSQL/Supabase.

### Soporte documental y operativo

El repositorio incluye JSON de cuadernillos, plantillas de Excel, mappings globales y utilidades para email, periodos académicos y exportación.

## Criterios de diseño

- Separación por roles y por dominios funcionales.
- Uso de un flujo de alta adaptado al estado del alumno.
- Trazabilidad de asistencia y evaluaciones.
- Soporte para exportación y estandarización de datos académicos.

## Puntos de entrada

- Backend: `backend/app/main.py`
- Frontend: `frontend/app/page.tsx`

## Comunicación entre capas

El frontend consume la API usando cookies/token de sesión. El backend añade CORS para permitir el acceso desde el desarrollo local y el despliegue configurado.