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
    # cascade="all, delete-orphan" asegura que si borras el usuario, se borre el perfil de alumno
    alumno_perfil = relationship(
        "Alumno",
        foreign_keys="[Alumno.usuario_id]",
        back_populates="usuario_login",
        uselist=False,
        cascade="all, delete-orphan",
    )
    alumnos_tutorizados = relationship(
        "Alumno", foreign_keys="[Alumno.tutor_id]", back_populates="tutor_asignado"
    )
    rotaciones_tutorizadas = relationship("Rotacion", back_populates="tutor")


class Alumno(Base):
    __tablename__ = "alumnos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, unique=True
    )

    # --- NUEVO: EL TUTOR PERTENECE AL ALUMNO ---
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

    # Datos Académicos
    curso = Column(Integer, nullable=False)
    grupo = Column(String, nullable=False)
    codigo_anonimo = Column(String, unique=True, nullable=False, index=True)

    # Datos Personales (Cifrados por RGPD)
    nombre_cifrado = Column(LargeBinary, nullable=False)
    apellidos_cifrado = Column(LargeBinary, nullable=False)
    email_cifrado = Column(LargeBinary, nullable=False)

    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones ACTUALIZADAS
    # 1. Relación con su propia cuenta de login
    usuario_login = relationship(
        "Usuario", foreign_keys=[usuario_id], back_populates="alumno_perfil"
    )

    # 2. Relación con su profesor
    tutor_asignado = relationship(
        "Usuario", foreign_keys=[tutor_id], back_populates="alumnos_tutorizados"
    )

    rotaciones = relationship(
        "Rotacion", back_populates="alumno", cascade="all, delete-orphan"
    )


class Rotacion(Base):
    __tablename__ = "rotaciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

    numero_rotacion = Column(Integer, nullable=False)  # 1, 2 o 3
    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    completada = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    alumno = relationship("Alumno", back_populates="rotaciones")
    tutor = relationship("Usuario", back_populates="rotaciones_tutorizadas")
