from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    ForeignKey,
    Date,
    DateTime,
    LargeBinary,
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
    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    alumno_perfil = relationship(
        "Alumno",
        foreign_keys="[Alumno.usuario_id]",
        back_populates="usuario_login",
        uselist=False,
        cascade="all, delete-orphan",
    )
    # NUEVO: Relación con la tabla intermedia
    asignaciones_rotaciones = relationship(
        "AsignacionTutor", back_populates="tutor", cascade="all, delete-orphan"
    )


class Alumno(Base):
    __tablename__ = "alumnos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, unique=True
    )

    # ELIMINADO: tutor_id. ¡El tutor ya no pertenece al alumno!

    # Datos Académicos base
    curso = Column(Integer, nullable=False)
    grupo = Column(String, nullable=False)
    numero_rotacion = Column(Integer, nullable=False, default=1)
    codigo_anonimo = Column(String, unique=True, nullable=False, index=True)

    # Datos Personales (Cifrados por RGPD)
    nombre_cifrado = Column(LargeBinary, nullable=False)
    apellidos_cifrado = Column(LargeBinary, nullable=False)
    email_cifrado = Column(LargeBinary, nullable=False)

    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    usuario_login = relationship(
        "Usuario", foreign_keys=[usuario_id], back_populates="alumno_perfil"
    )
    rotaciones = relationship(
        "Rotacion", back_populates="alumno", cascade="all, delete-orphan"
    )


class Rotacion(Base):
    __tablename__ = "rotaciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)

    # --- NUEVOS CAMPOS ---
    curso = Column(Integer, nullable=True)
    numero_rotacion = Column(Integer, nullable=True)
    # ---------------------

    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    completada = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    alumno = relationship("Alumno", back_populates="rotaciones")
    asignaciones_tutores = relationship(
        "AsignacionTutor", back_populates="rotacion", cascade="all, delete-orphan"
    )
    __table_args__ = (
        UniqueConstraint(
            "alumno_id", "curso", "numero_rotacion", name="_alumno_curso_rot_uc"
        ),
    )


# --- NUEVA TABLA INTERMEDIA (N:M) ---
class AsignacionTutor(Base):
    __tablename__ = "asignaciones_tutores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    rotacion_id = Column(
        UUID(as_uuid=True), ForeignKey("rotaciones.id"), nullable=False
    )
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    tutor = relationship("Usuario", back_populates="asignaciones_rotaciones")
    rotacion = relationship("Rotacion", back_populates="asignaciones_tutores")


class CuadernilloRespuesta(Base):
    # ... (Se mantiene exactamente igual que lo tienes) ...
    __tablename__ = "cuadernillo_respuestas"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rotacion_id = Column(
        UUID(as_uuid=True), ForeignKey("rotaciones.id"), nullable=False
    )
    version_cuadernillo = Column(String, nullable=False)
    bloque = Column(Integer, nullable=False)
    elemento_id = Column(String, nullable=False)
    valor_sinon = Column(Boolean, nullable=True)
    valor_nivel = Column(Integer, nullable=True)
    comentario = Column(String, nullable=True)
    rellenado_por = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    guardado_en = Column(DateTime(timezone=True), server_default=func.now())
    rotacion = relationship("Rotacion")
