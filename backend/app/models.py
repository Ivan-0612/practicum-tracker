from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    ForeignKey,
    Date,
    DateTime,
    LargeBinary,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from sqlalchemy import UniqueConstraint
from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    rol = Column(String, nullable=False)  # 'admin', 'profesor', 'estudiante'
    
    # Campo nuevo que añadimos antes
    tipo_tutor = Column(String, nullable=True) 
    
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # --- CAMBIO AQUÍ: Quitamos el foreign_keys ---
    alumno_perfil = relationship(
        "Alumno",
        back_populates="usuario_login",
        uselist=False,
        cascade="all, delete-orphan",
    )
    
    asignaciones_rotaciones = relationship(
        "AsignacionTutor", back_populates="tutor", cascade="all, delete-orphan"
    )


class Alumno(Base):
    __tablename__ = "alumnos"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, unique=True
    )

    curso = Column(Integer, nullable=False)
    grupo = Column(String, nullable=False)
    numero_rotacion = Column(Integer, nullable=False, default=1)
    codigo_anonimo = Column(String, unique=True, nullable=False, index=True)

    nombre_cifrado = Column(LargeBinary, nullable=False)
    apellidos_cifrado = Column(LargeBinary, nullable=False)
    email_cifrado = Column(LargeBinary, nullable=False)

    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # --- CAMBIO AQUÍ: Quitamos el foreign_keys ---
    usuario_login = relationship(
        "Usuario", back_populates="alumno_perfil"
    )
    
    rotaciones = relationship(
        "Rotacion", back_populates="alumno", cascade="all, delete-orphan"
    )


# --- NUEVA TABLA: ESPECIALIDADES ---
class Especialidad(Base):
    __tablename__ = "especialidades"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, unique=True, nullable=False)

    # --- CAMBIO AQUÍ: Ahora guardamos el JSON directamente ---
    contenido_json = Column(JSON, nullable=False)

    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    rotaciones = relationship("Rotacion", back_populates="especialidad")


class Rotacion(Base):
    __tablename__ = "rotaciones"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)

    # --- NUEVO: VINCULAMOS LA ROTACIÓN A LA ESPECIALIDAD ---
    especialidad_id = Column(
        UUID(as_uuid=True), ForeignKey("especialidades.id"), nullable=True
    )

    curso = Column(Integer, nullable=True)
    numero_rotacion = Column(Integer, nullable=True)
    periodo_academico = Column(String, nullable=False, default="2025/2026")
    centro_practicas = Column(String, nullable=True)
    fecha_inicio = Column(Date, nullable=True)

    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    completada = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    alumno = relationship("Alumno", back_populates="rotaciones")
    especialidad = relationship("Especialidad", back_populates="rotaciones")
    asignaciones_tutores = relationship(
        "AsignacionTutor", back_populates="rotacion", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "curso", "numero_rotacion", name="_alumno_curso_rot_uc"
        ),
    )


class AsignacionTutor(Base):
    __tablename__ = "asignaciones_tutores"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    rotacion_id = Column(
        UUID(as_uuid=True), ForeignKey("rotaciones.id"), nullable=False
    )
    
    tipo_tutor = Column(String, nullable=False, default="hospital") # 'hospital' o 'universidad'
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    tutor = relationship("Usuario", back_populates="asignaciones_rotaciones")
    rotacion = relationship("Rotacion", back_populates="asignaciones_tutores")

class CuadernilloRespuesta(Base):
    __tablename__ = "cuadernillo_respuestas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rotacion_id = Column(
        UUID(as_uuid=True), ForeignKey("rotaciones.id"), nullable=False, unique=True
    )

    # Aquí guardamos TODO el borrador en un solo campo:
    # { "elemento_1": {"valor_nivel": 3, "comentario": "..."}, "elemento_2": {...} }
    respuestas_json = Column(JSON, nullable=False)

    rellenado_por = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    guardado_en = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    rotacion = relationship("Rotacion")

class RegistroAsistencia(Base):
    __tablename__ = "registro_asistencia"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rotacion_id = Column(UUID(as_uuid=True), ForeignKey("rotaciones.id"), nullable=False)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    fecha = Column(Date, nullable=False) # El día del calendario
    firmado_en = Column(DateTime(timezone=True), server_default=func.now())
    firmado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)

    rotacion = relationship("Rotacion")
    alumno = relationship("Alumno")
    tutor = relationship("Usuario")
    
    __table_args__ = (
        UniqueConstraint("rotacion_id", "alumno_id", "fecha", name="_rot_alu_fecha_uc"),
    )

class IntentoLogin(Base):
    __tablename__ = "intentos_login"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, unique=True
    )
    email = Column(String, nullable=False, index=True)
    intentos = Column(Integer, default=0)
    ultimo_intento = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    bloqueado_hasta = Column(DateTime(timezone=True), nullable=True)
    usuario = relationship("Usuario")


class TokenRecuperacion(Base):
    __tablename__ = "tokens_recuperacion"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="CASCADE"),
        nullable=False,
    )
    token = Column(String, unique=True, index=True, nullable=False)
    expira_at = Column(DateTime(timezone=True), nullable=False)
    usado = Column(Boolean, default=False)
