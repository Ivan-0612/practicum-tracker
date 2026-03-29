from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas, security

router = APIRouter(prefix="/api/v1/profesores", tags=["Profesores"])

@router.get("/mis-alumnos")
def obtener_mis_alumnos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    # Buscar alumnos donde el tutor_id sea el del profesor logueado
    mis_alumnos = (
        db.query(models.Alumno).filter(models.Alumno.tutor_id == current_user.id).all()
    )

    resultado = []
    for alumno in mis_alumnos:
        # --- NUEVO: Buscamos la rotación del alumno (sin filtrar si está completada o no) ---
        rotacion_activa = (
            db.query(models.Rotacion)
            .filter(
                models.Rotacion.alumno_id == alumno.id
            )
            .order_by(models.Rotacion.creado_en.desc()) # Pillamos la más reciente por si acaso
            .first()
        )

        # --- NUEVO: Determinamos el estado para enviarlo al Frontend ---
        estado = "Pendiente"
        if rotacion_activa and rotacion_activa.completada:
            estado = "Completada"

        # Usamos la Master Key cargada en security.py automáticamente
        nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
        apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)
        email_real = security.descifrar_dato(alumno.email_cifrado)

        resultado.append(
            {
                "alumno_id": str(alumno.id),
                "rotacion_id": str(rotacion_activa.id) if rotacion_activa else "",
                "nombre_completo": f"{nombre_real} {apellidos_real}",
                "email_personal": email_real,
                "curso": alumno.curso,
                "grupo": alumno.grupo,
                "numero_rotacion": alumno.numero_rotacion,
                # --- NUEVO: Añadimos el estado aquí ---
                "estado_evaluacion": estado 
            }
        )

    return resultado