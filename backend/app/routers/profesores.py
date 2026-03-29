from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, security

router = APIRouter(prefix="/api/v1/profesores", tags=["Profesores"])


@router.get("/mis-alumnos")
def obtener_mis_alumnos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="Acceso solo para profesores")

    asignaciones = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.tutor_id == current_user.id)
        .all()
    )

    resultado = []
    for asig in asignaciones:
        rotacion = asig.rotacion
        if not rotacion:
            continue

        alumno = rotacion.alumno
        if not alumno:
            continue

        # 1. Buscamos el usuario para sacar el email de acceso
        usuario_estudiante = (
            db.query(models.Usuario)
            .filter(models.Usuario.id == alumno.usuario_id)
            .first()
        )

        # 2. Desciframos los datos personales
        try:
            nombre = security.descifrar_dato(alumno.nombre_cifrado)
            apellidos = security.descifrar_dato(alumno.apellidos_cifrado)
        except:
            nombre, apellidos = "Error", "Cifrado"

        # 3. Lógica de estados dinámica:
        # Primero miramos si hay respuestas guardadas en la DB para esta rotación
        tiene_respuestas = (
            db.query(models.CuadernilloRespuesta)
            .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
            .first()
            is not None
        )

        if rotacion.completada:
            estado = "Completada"
        elif tiene_respuestas:
            estado = "En Proceso"  # Aparecerá como Borrador en el Frontend
        else:
            estado = "Pendiente"

        resultado.append(
            {
                "rotacion_id": str(rotacion.id),
                "alumno_id": str(alumno.id),
                "email": (
                    usuario_estudiante.email if usuario_estudiante else "Sin email"
                ),
                "nombre_completo": f"{nombre} {apellidos}",
                "curso": rotacion.curso,
                "numero_rotacion": rotacion.numero_rotacion,
                "grupo": alumno.grupo,
                "completada": rotacion.completada,
                "codigo_anonimo": alumno.codigo_anonimo,
                "estado_evaluacion": estado,  # <--- Enviamos el estado calculado
            }
        )

    return resultado
