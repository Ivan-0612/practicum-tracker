from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
from .routers import auth, alumnos, admin, profesores, cuadernillos, tutores_campo
from sqlalchemy import text

from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse
from .utils.red_utils import obtener_ip_cliente

# Esta línea le dice a SQLAlchemy que cree las tablas en Supabase
Base.metadata.create_all(bind=engine)


def aplicar_migraciones_ligeras():
    stmts = [
        "ALTER TABLE especialidades ADD COLUMN IF NOT EXISTS plantilla_excel_storage_path VARCHAR",
        "ALTER TABLE rotaciones ADD COLUMN IF NOT EXISTS hospital_finalize_count INTEGER DEFAULT 0 NOT NULL",
        "ALTER TABLE rotaciones ADD COLUMN IF NOT EXISTS hospital_first_finalized_at TIMESTAMPTZ",
        "ALTER TABLE rotaciones ADD COLUMN IF NOT EXISTS hospital_second_finalized_at TIMESTAMPTZ",
        "ALTER TABLE rotaciones ADD COLUMN IF NOT EXISTS final_grade_text VARCHAR",
        "ALTER TABLE rotaciones ADD COLUMN IF NOT EXISTS final_grade_calculated_at TIMESTAMPTZ",
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS registro_completado BOOLEAN DEFAULT TRUE NOT NULL",
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS curso_pendiente INTEGER",
        "CREATE TABLE IF NOT EXISTS centros_practicas (id UUID PRIMARY KEY, nombre VARCHAR NOT NULL, tutor_hospital_id UUID NOT NULL REFERENCES usuarios(id), tutor_universidad_id UUID NOT NULL REFERENCES usuarios(id), activo BOOLEAN DEFAULT TRUE, creado_en TIMESTAMPTZ DEFAULT NOW())",
        "DROP INDEX IF EXISTS uq_centro_nombre_especialidad",
        "CREATE UNIQUE INDEX IF NOT EXISTS uq_centro_nombre ON centros_practicas (nombre)",
        "ALTER TABLE centros_practicas DROP COLUMN IF EXISTS especialidad_id",
        # Tabla de invitaciones de tutor de campo por enlace
        """CREATE TABLE IF NOT EXISTS invitaciones_tutor_campo (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            rotacion_id UUID NOT NULL REFERENCES rotaciones(id) ON DELETE CASCADE,
            token VARCHAR NOT NULL UNIQUE,
            usado BOOLEAN NOT NULL DEFAULT FALSE,
            expira_at TIMESTAMPTZ NOT NULL,
            creado_en TIMESTAMPTZ DEFAULT NOW()
        )""",
        "CREATE INDEX IF NOT EXISTS ix_invitaciones_tutor_campo_token ON invitaciones_tutor_campo (token)",
    ]
    with engine.begin() as conn:
        for stmt in stmts:
            conn.execute(text(stmt))


aplicar_migraciones_ligeras()

app = FastAPI(
    title="Practicum Tracker API",
    description="API para la gestión de prácticas clínicas",
    version="1.0.0",
)

limiter = Limiter(key_func=obtener_ip_cliente)
app.state.limiter = limiter


# Respuesta en el mismo formato que el resto de errores ({"detail": ...}) para
# que el frontend pueda mostrar el mensaje al usuario.
@app.exception_handler(RateLimitExceeded)
async def limite_superado(request: Request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo."},
    )


# permitir que el frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://gestion-practicas-fronted.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(alumnos.router)
app.include_router(admin.router)
app.include_router(profesores.router)
app.include_router(cuadernillos.router)
app.include_router(tutores_campo.router)


@app.get("/")
def read_root():
    return {
        "mensaje": "¡El backend de Practicum Tracker está funcionando correctamente!"
    }
