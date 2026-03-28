from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, security
import uuid
import secrets

router = APIRouter(prefix="/api/v1/alumnos", tags=["Alumnos"])


@router.post("/", response_model=schemas.AlumnoResponse)
def crear_alumno(alumno_in: schemas.AlumnoCreate, db: Session = Depends(get_db)):
    # 1. Buscar al tutor por su email antes de hacer nada
    tutor = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.email == alumno_in.email_tutor,
            models.Usuario.rol == "profesor",  # Nos aseguramos de que sea un profesor
        )
        .first()
    )

    if not tutor:
        raise HTTPException(
            status_code=404, detail="No existe ningún profesor con ese email"
        )

    # 2. Crear el Usuario de acceso para el alumno
    nuevo_usuario = models.Usuario(
        email=alumno_in.email_acceso,
        password_hash=security.get_password_hash(alumno_in.password_acceso),
        rol="estudiante",
    )
    db.add(nuevo_usuario)
    db.flush()

    # 3. Crear el Alumno (Datos personales cifrados)
    nuevo_alumno = models.Alumno(
        usuario_id=nuevo_usuario.id,
        tutor_id=tutor.id,  # <--- ¡AQUÍ SE VINCULAN DIRECTAMENTE!
        curso=alumno_in.curso,
        grupo=alumno_in.grupo,
        codigo_anonimo=f"ALU-{secrets.token_hex(3).upper()}",
        nombre_cifrado=security.cifrar_dato(alumno_in.nombre),
        apellidos_cifrado=security.cifrar_dato(alumno_in.apellidos),
        email_cifrado=security.cifrar_dato(alumno_in.email_personal),
    )
    db.add(nuevo_alumno)
    db.flush()

    # 4. Crear la Rotación vinculándola al Tutor que encontramos por email
    nueva_rotacion = models.Rotacion(
        alumno_id=nuevo_alumno.id,
        tutor_id=tutor.id,  # <--- Aquí usamos el ID interno que encontramos
        numero_rotacion=alumno_in.numero_rotacion,
    )
    db.add(nueva_rotacion)

    db.commit()
    db.refresh(nuevo_alumno)
    return nuevo_alumno
