from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
from .routers import auth, alumnos, admin, profesores, cuadernillos

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Esta línea le dice a SQLAlchemy que cree las tablas en Supabase
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Practicum Tracker API",
    description="API para la gestión de prácticas clínicas",
    version="1.0.0",
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


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


@app.get("/")
def read_root():
    return {
        "mensaje": "¡El backend de Practicum Tracker está funcionando correctamente!"
    }
