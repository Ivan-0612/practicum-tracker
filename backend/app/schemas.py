from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime


# ==========================================
# ESQUEMAS DE USUARIO (Login y Autenticación)
# ==========================================
class UsuarioBase(BaseModel):
    email: EmailStr
    rol: str = Field(..., pattern="^(admin|profesor|estudiante)$")


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=8)


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
    archivo_json: str


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
    email_tutor: EmailStr
    numero_rotacion: int = 1
    especialidad_id: UUID  # <-- NUEVO: Obligatorio al matricular


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
    especialidad_id: UUID  # <-- NUEVO: Al asignar rotación nueva
    curso: int
    numero_rotacion: int
    email_tutor: EmailStr


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
    tipo: str
    ubicacion_permitida: bool
    latitud: Optional[str] = None
    longitud: Optional[str] = None


class AsistenciaResponse(BaseModel):
    id: UUID
    fecha: date
    hora_entrada: Optional[datetime]
    hora_salida: Optional[datetime]

    class Config:
        from_attributes = True


class CambioPassword(BaseModel):
    password_actual: str
    nueva_password: str = Field(..., min_length=8)
    confirmar_password: str


class SolicitarRecuperacion(BaseModel):
    email: EmailStr


class RestablecerPassword(BaseModel):
    token: str
    nueva_password: str = Field(..., min_length=8)
