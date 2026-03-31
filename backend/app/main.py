from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
from .routers import auth, alumnos, admin, profesores, cuadernillos

# Esta línea le dice a SQLAlchemy que cree las tablas en Supabase
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Practicum Tracker API",
    description="API para la gestión de prácticas clínicas",
    version="1.0.0",
)

# permitir que el frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "*"
    ],  # Temporalmente "*" para facilitar el despliegue, luego pon la URL de Render
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(alumnos.router)
app.include_router(admin.router)
app.include_router(profesores.router)
app.include_router(cuadernillos.router)


@app.get("/")
def read_root():
    return {
        "mensaje": "¡El backend de Practicum Tracker está funcionando correctamente!"
    }
