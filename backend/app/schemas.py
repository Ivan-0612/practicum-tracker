# esquema que deben tener los datos para entrar en postgress

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID
from datetime import date, datetime


# ==========================================
# ESQUEMAS DE USUARIO (Login y Autenticación)
# ==========================================
class UsuarioBase(BaseModel):
    email: EmailStr  # Valida automáticamente que tenga un @ y formato correcto
    rol: str = Field(..., pattern="^(admin|profesor|estudiante)$")


class UsuarioCreate(UsuarioBase):
    password: str = Field(
        ..., min_length=8
    )  # Obliga a que la contraseña tenga mínimo 8 caracteres


class UsuarioResponse(UsuarioBase):
    id: UUID
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = (
            True  # Permite a Pydantic leer los datos directamente de SQLAlchemy
        )


# ==========================================
# ESQUEMAS DE ALUMNO
# ==========================================
class AlumnoBase(BaseModel):
    # Datos Personales/Académicos
    nombre: str
    apellidos: str
    email_personal: EmailStr
    curso: int
    grupo: str
    email_acceso: EmailStr
    password_acceso: str
    email_tutor: UUID
    numero_rotacion: int = 1


class AlumnoCreate(AlumnoBase):
    # Al crear un alumno desde el panel de Admin, necesitamos crear también su cuenta de acceso
    email_acceso: EmailStr
    password_acceso: str = Field(..., min_length=8)
    email_tutor: EmailStr
    numero_rotacion: int = 1


class AlumnoResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    curso: int
    grupo: str
    numero_rotacion: int
    codigo_anonimo: str
    activo: bool

    # ⚠️ ATENCIÓN RGPD:  en la respuesta NO se incluye el nombre ni los apellidos.
    # Por defecto, la API devuelve los alumnos anonimizados.
    # Habrá un endpoint especial para "desbloquear" la identidad.

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE ROTACIÓN
# ==========================================
class RotacionBase(BaseModel):
    # Eliminamos numero_rotacion de aquí porque ya está en Alumno
    fecha_inicio: Optional[date] = None


class RotacionCreate(RotacionBase):
    alumno_id: UUID
    # Eliminamos tutor_id de aquí


class RotacionResponse(RotacionBase):
    id: UUID
    alumno_id: UUID
    fecha_fin: Optional[date]
    completada: bool

    class Config:
        from_attributes = True
