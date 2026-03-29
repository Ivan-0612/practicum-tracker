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


class Alumno(Base):
    __tablename__ = "alumnos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False, unique=True)
    
    # El tutor le pertenece al alumno
    tutor_id = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=True)

    # Datos Académicos
    curso = Column(Integer, nullable=False)
    grupo = Column(String, nullable=False)
    numero_rotacion = Column(Integer, nullable=False, default=1) # <--- AQUÍ ESTÁ, DENTRO DEL ALUMNO
    codigo_anonimo = Column(String, unique=True, nullable=False, index=True)

    # Datos Personales (Cifrados por RGPD)
    nombre_cifrado = Column(LargeBinary, nullable=False)
    apellidos_cifrado = Column(LargeBinary, nullable=False)
    email_cifrado = Column(LargeBinary, nullable=False)

    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    usuario_login = relationship("Usuario", foreign_keys=[usuario_id], back_populates="alumno_perfil")
    tutor_asignado = relationship("Usuario", foreign_keys=[tutor_id], back_populates="alumnos_tutorizados")
    rotaciones = relationship("Rotacion", back_populates="alumno", cascade="all, delete-orphan")


class Rotacion(Base):
    __tablename__ = "rotaciones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # La rotación AHORA SOLO le pertenece al alumno. Fuera el tutor de aquí.
    alumno_id = Column(UUID(as_uuid=True), ForeignKey("alumnos.id"), nullable=False)

    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    completada = Column(Boolean, default=False)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    alumno = relationship("Alumno", back_populates="rotaciones")
    # ELIMINAMOS la relación con el tutor


class CuadernilloRespuesta(Base):
    __tablename__ = "cuadernillo_respuestas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rotacion_id = Column(UUID(as_uuid=True), ForeignKey("rotaciones.id"), nullable=False)
    
    # Guardamos la versión del JSON usado (ej: "2025-C2-R1") por si el año que viene cambian las preguntas
    version_cuadernillo = Column(String, nullable=False) 
    
    # 0 para lista Sí/No, 1-7 para los apartados de niveles
    bloque = Column(Integer, nullable=False) 
    
    # El ID exacto que le pongamos a la pregunta en el JSON (ej: "b0_01")
    elemento_id = Column(String, nullable=False) 
    
    # Aquí se guardan los datos (uno u otro dependiendo del bloque)
    valor_sinon = Column(Boolean, nullable=True) # Para el bloque 0
    valor_nivel = Column(Integer, nullable=True) # Para los bloques 1-7 (guardará 1, 2 o 3)
    comentario = Column(String, nullable=True)
    
    # Quién rellenó esto
    rellenado_por = Column(UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False)
    
    guardado_en = Column(DateTime(timezone=True), server_default=func.now())

    # Relación
    rotacion = relationship("Rotacion")