from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import date, datetime
import re


# ==========================================
# ESQUEMAS DE USUARIO (Login y Autenticación)
# ==========================================
class UsuarioBase(BaseModel):
    email: EmailStr
    rol: str = Field(..., pattern="^(admin|profesor|estudiante)$")


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=8)  # Contraseña provisional sencilla
    tipo_tutor: Optional[str] = None


class UsuarioResponse(UsuarioBase):
    id: UUID
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = True


# ==========================================
# NUEVO: ESQUEMAS DE ESPECIALIDADES
# ==========================================
class EspecialidadBase(BaseModel):
    nombre: str
    contenido_json: Dict[str, Any]


class EspecialidadCreate(EspecialidadBase):
    pass


class EspecialidadResponse(EspecialidadBase):
    id: UUID
    creado_en: datetime

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE ALUMNO
# ==========================================
class AlumnoBase(BaseModel):
    nombre: str
    apellidos: str
    email_personal: EmailStr
    curso: int
    grupo: str
    email_acceso: EmailStr
    password_acceso: str

    # --- CAMBIOS: PEDIMOS LOS DOS TUTORES ---
    email_tutor_hospital: EmailStr
    email_tutor_universidad: EmailStr
    # ----------------------------------------

    numero_rotacion: int = 1
    periodo_academico: str = "2025/2026"
    especialidad_id: UUID


class AlumnoCreate(AlumnoBase):
    pass


class AlumnoResponse(BaseModel):
    id: UUID
    usuario_id: UUID
    curso: int
    grupo: str
    numero_rotacion: int
    codigo_anonimo: str
    activo: bool

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE ROTACIÓN
# ==========================================
class RotacionBase(BaseModel):
    fecha_inicio: Optional[date] = None


class RotacionCreate(RotacionBase):
    alumno_id: UUID
    especialidad_id: UUID
    curso: int
    numero_rotacion: int
    periodo_academico: str

    # --- CAMBIOS: PEDIMOS LOS DOS TUTORES ---
    email_tutor_hospital: EmailStr
    email_tutor_universidad: EmailStr
    # ----------------------------------------


class RotacionResponse(RotacionBase):
    id: UUID
    alumno_id: UUID
    especialidad_id: Optional[UUID]
    fecha_fin: Optional[date]
    completada: bool

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE RESPUESTAS DEL CUADERNILLO
# ==========================================
class RespuestaBase(BaseModel):
    bloque: int
    elemento_id: str
    valor_sinon: Optional[bool] = None
    valor_nivel: Optional[int] = None
    comentario: Optional[str] = None


class RespuestaCreate(RespuestaBase):
    pass


class RespuestaResponse(RespuestaBase):
    id: UUID
    rotacion_id: UUID
    version_cuadernillo: str

    class Config:
        from_attributes = True


# ==========================================
# ESQUEMAS DE ASISTENCIA Y SEGURIDAD
# ==========================================
class AsistenciaCreate(BaseModel):
    rotacion_id: UUID
    fecha: date


class AsistenciaResponse(BaseModel):
    id: UUID
    fecha: date
    firmado_en: datetime

    class Config:
        from_attributes = True


class CambioPassword(BaseModel):
    password_actual: str
    nueva_password: str = Field(..., min_length=8)
    confirmar_password: str

    @field_validator("nueva_password")
    @classmethod
    def validar_password_fuerte(cls, v: str) -> str:
        # Esta validación SOLO se ejecutará aquí
        patron = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(patron, v):
            raise ValueError(
                "La nueva contraseña debe tener al menos una mayúscula, "
                "una minúscula, un número y un carácter especial (@$!%*?&)"
            )
        return v


class SolicitarRecuperacion(BaseModel):
    email: EmailStr


class RestablecerPassword(BaseModel):
    token: str
    nueva_password: str = Field(..., min_length=8)

    @field_validator("nueva_password")
    @classmethod
    def validar_password_fuerte(cls, v: str) -> str:
        # 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial
        patron = r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$"
        if not re.match(patron, v):
            raise ValueError(
                "La nueva contraseña debe tener al menos una mayúscula, "
                "una minúscula, un número y un carácter especial (@$!%*?&)"
            )
        return v
