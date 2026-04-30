# Practicum Tracker

Practicum Tracker es una plataforma para gestionar las practicas clinicas del alumnado de enfermeria. El sistema centraliza el alta de usuarios, la asignacion de rotaciones, la gestion de tutores, la evaluacion mediante cuadernillos, el control de asistencia y la exportacion de plantillas o informes para administracion.

Este repositorio contiene dos aplicaciones:

- `backend/`: API en FastAPI con SQLAlchemy y PostgreSQL/Supabase.
- `frontend/`: aplicacion web en Next.js para los distintos roles del sistema.

## Objetivo funcional

El proyecto cubre el ciclo completo de una rotacion de practicas:

1. La administracion crea o importa alumnos.
2. Se asignan especialidades, centros y tutores.
3. El alumno completa su registro y accede al portal.
4. El profesorado registra asistencia y evalua el cuadernillo.
5. La administracion consulta estadisticas, exporta Excel y mantiene plantillas globales.

## Arquitectura general

La aplicacion sigue una arquitectura separada por capas:

- Frontend: interfaz de usuario y flujos por rol.
- Backend: API REST, validaciones, logica de negocio y acceso a datos.
- Base de datos: persistencia de usuarios, rotaciones, asistencia, respuestas y plantillas.
- Ficheros de soporte: JSON de cuadernillos, mappings Excel y plantillas globales.

El backend expone una API versionada bajo `/api/v1/...` y el frontend consume esos endpoints para mostrar dashboards y formularios.

## Estructura del repositorio

### `backend/`

- `app/main.py`: punto de entrada de FastAPI. Registra routers, CORS, rate limiting y algunas migraciones ligeras al arrancar.
- `app/database.py`: configuracion de la conexion a la base de datos.
- `app/models.py`: modelos SQLAlchemy y relaciones.
- `app/schemas.py`: esquemas Pydantic para entrada y salida de datos.
- `app/security.py`: utilidades de autenticacion, hashing y validacion de sesiones o tokens.
- `app/routers/`: endpoints agrupados por dominio.
- `app/utils/`: utilidades para email, Excel, periodos academicos, mappings y manejo de JSON.
- `crear_admin.py`: script de utilidad para crear un usuario administrador inicial.
- `cuadernillos/`: definiciones JSON de especialidades, ejemplos y plantillas.

### `frontend/`

- `app/`: rutas de Next.js App Router.
- `components/`: modales y componentes reutilizables.
- `lib/utils.ts`: utilidades compartidas del frontend.
- `public/`: recursos estaticos.

## Roles del sistema

### Administracion

Gestiona alumnos, profesores, centros de practicas, especialidades, plantillas Excel, unidades de competencia, rotaciones y exportaciones.

### Profesorado

Consulta su alumnado asignado, registra asistencia y completa evaluaciones asociadas a las rotaciones.

### Alumno

Completa el registro, accede a su dashboard, revisa asistencia y realiza el proceso de evaluacion cuando corresponde.

## Flujo actual de registro

El proyecto usa un flujo de alta adaptado al estado actual del backend:

1. La administracion puede crear un pre-registro de alumno solo con email.
2. El alumno completa el alta desde el flujo publico en dos pasos.
3. El login bloquea a estudiantes con registro pendiente hasta terminar el proceso.
4. Al finalizar, el alumno queda listo para recibir rotaciones y acceder al sistema.

Endpoints relacionados:

- `POST /api/v1/alumnos/pre-registro`
- `POST /api/v1/auth/registro/verificar-email`
- `POST /api/v1/auth/registro/completar`
- `POST /api/v1/auth/login`

## Modelos de datos principales

### `Usuario`

Representa la cuenta de acceso. Guarda email, hash de password, rol, tipo de tutor, estado activo y marcas de completitud de registro.

### `Alumno`

Perfil academico del estudiante. Incluye curso, grupo, numero de rotacion, codigo anonimo y datos personales cifrados.

### `Especialidad`

Contiene el nombre de la especialidad y el JSON del cuadernillo asociado.

### `CentroPracticas`

Relaciona un centro con un tutor hospital y un tutor universidad por defecto.

### `Rotacion`

Unidad principal del seguimiento academico. Vincula alumno, especialidad, periodo academico, centro, fechas, estado de cierre y nota final.

### `AsignacionTutor`

Asocia un profesor a una rotacion y distingue si actua como tutor hospital o tutor universidad.

### `CuadernilloRespuesta`

Guarda el borrador o respuesta completa de la evaluacion en JSON.

### `RegistroAsistencia`

Registra la asistencia firmada para una fecha concreta y evita duplicados por alumno, rotacion y dia.

### `PlantillaExcelMappingGlobal`

Almacena el mapping global entre indicadores y celdas de Excel.

### `UnidadesCompetenciaGlobal`

Guarda la estructura global de unidades de competencia y sus niveles.

### `IntentoLogin` y `TokenRecuperacion`

Controlan bloqueo por intentos fallidos y recuperacion de contrasena.

## Routers del backend

### `auth`

Gestiona autenticacion, registro en dos pasos, recuperacion de contrasena y validaciones de acceso.

### `alumnos`

Gestiona alta, importacion Excel, pre-registro, asignacion de rotaciones, consulta del perfil de evaluacion y flujos del alumno.

### `admin`

Centraliza la administracion: alumnos pendientes, profesores, centros, especialidades, plantillas, estadisticas y exportaciones.

### `profesores`

Expone vistas y operaciones para tutores y profesorado: alumnado asignado, asistencia y seguimiento.

### `cuadernillos`

Sirve la estructura de cuadernillos, mapeos por especialidad o rotacion y la descarga en PDF.

## Frontend por rutas

### Publico

- `/`: pagina inicial.
- `/login`: acceso al sistema.
- `/registro`: alta publica del alumno.
- `/restablecer-password`: recuperacion de contrasena.

### Administracion

- `/admin/panel`: panel principal.
- `/admin/alumnos`: gestion de alumnos.
- `/admin/alumnos/nuevo`: alta manual.
- `/admin/alumnos/importar`: importacion masiva.
- `/admin/alumnos/rotaciones/importar`: importacion de rotaciones.
- `/admin/profesores`: gestion de profesores.
- `/admin/profesores/nuevo`: alta de profesor.
- `/admin/centros`: gestion de centros de practicas.

### Alumno

- `/alumno/dashboard`: panel del alumno.
- `/alumno/asistencia/[id]`: detalle o firma de asistencia.
- `/alumno/evaluar/[id]`: evaluacion de la rotacion.
- `/alumno/seleccionar-especialidad`: paso previo del flujo de registro.

### Profesorado

- `/profesor/dashboard`: panel del tutor.
- `/profesor/asistencia/[id]`: gestion de asistencia.
- `/profesor/evaluar/[id]`: evaluacion de la rotacion.

## Ficheros de soporte en `backend/cuadernillos/`

### `plantillas/`

Contiene las plantillas base compartidas por el sistema:

- `actividades_nic_global.json`
- `unidades_competencia_global.json`

### `mappings/`

Contiene mapas de referencia para exportaciones o sincronizacion con Excel.

### `ejemplos/`

Ejemplos de cuadernillos por especialidad para desarrollo, pruebas o referencia.

### Cuadernillos por especialidad

Los JSON principales representan las especialidades soportadas por el sistema, por ejemplo:

- atencion primaria
- dialisis
- hospitalizacion I
- hospitalizacion II
- pediatria
- quirófano
- urgencias

## Utilidades del backend

### `email_utils.py`

Envio de correos, tipicamente para recuperacion de acceso o avisos de proceso.

### `excel_utils.py`

Lectura y generacion de ficheros Excel, incluyendo importaciones y exportaciones.

### `especialidad_json_utils.py`

Carga, validacion y transformacion de estructuras JSON de especialidades.

### `mapping_global_utils.py`

Gestion del mapping global entre el modelo interno y las plantillas Excel.

### `periodo_academico_utils.py`

Helpers para calcular o validar el periodo academico.

### `unidades_competencia_global_utils.py`

Gestion de la estructura global de unidades de competencia.

## Comportamiento importante del backend

- El arranque crea tablas y aplica migraciones ligeras necesarias para mantener el esquema compatible.
- Hay CORS habilitado para el frontend local y para el despliegue configurado.
- El backend usa rate limiting para proteger endpoints sensibles.
- Algunos datos, como nombres y emails de alumnos, se almacenan cifrados en la base de datos.
- La baja logica es importante para usuarios con historico en asistencia o evaluacion.

## Como ejecutar el proyecto

### Backend

1. Crear y activar el entorno virtual.
2. Instalar dependencias del backend desde `backend/requirements.txt`.
3. Configurar las variables de entorno necesarias para la conexion a base de datos y seguridad.
4. Ejecutar la aplicacion FastAPI desde `backend/app/main.py`.

### Frontend

1. Entrar en `frontend/`.
2. Instalar dependencias con `npm install`.
3. Ejecutar `npm run dev`.
4. Abrir `http://localhost:3000`.

## Documentación detallada

La documentación ampliada está separada en archivos más concretos dentro de [docs/](docs/):

- [docs/README.md](docs/README.md)
- [docs/arquitectura.md](docs/arquitectura.md)
- [docs/backend.md](docs/backend.md)
- [docs/frontend.md](docs/frontend.md)
- [docs/modelo-datos.md](docs/modelo-datos.md)
- [docs/flujo-funcional.md](docs/flujo-funcional.md)

## Notas de mantenimiento

- Si cambias el flujo de registro, actualiza al mismo tiempo backend, frontend y esta documentacion.
- Si se agrega una nueva especialidad, revisar el JSON del cuadernillo, el mapping Excel y las pantallas asociadas.
- Si se modifica el modelo de rotacion, verificar los endpoints de alumno, profesor y admin que dependen de ese estado.
- Si se agrega una nueva ruta del frontend, documentarla aqui para mantener el mapa de la aplicacion actualizado.

## Estado del proyecto

El sistema ya contempla:

- alta y login de usuarios con roles,
- pre-registro y completado de alumno,
- importacion de alumnos y rotaciones,
- gestion de centros de practicas,
- cuadernillos de evaluacion,
- asistencia,
- exportaciones Excel,
- soporte para plantillas y mappings globales.

Si quieres, el siguiente paso natural es separar esta documentacion en una carpeta `docs/` con archivos mas especificos por modulo, pero esta raiz ya deja una vista global completa del proyecto.