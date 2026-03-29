from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, security
import json
import os
from typing import List
from ..schemas import RespuestaCreate

router = APIRouter(prefix="/api/v1/cuadernillos", tags=["Cuadernillos"])


@router.get("/molde/{rotacion_id}")
def obtener_molde_cuadernillo(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol not in ["profesor", "estudiante"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    alumno = (
        db.query(models.Alumno).filter(models.Alumno.id == rotacion.alumno_id).first()
    )

    nombre_archivo = f"curso{alumno.curso}-rotacion{alumno.numero_rotacion}.json"
    ruta_archivo = os.path.join(os.getcwd(), "cuadernillos", nombre_archivo)

    try:
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            molde_json = json.load(f)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontró el archivo {nombre_archivo} en el servidor.",
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail=f"El archivo {nombre_archivo} existe pero no tiene un formato JSON válido.",
        )

    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)

    respuestas_db = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .all()
    )

    borrador = {}
    for resp in respuestas_db:
        borrador[resp.elemento_id] = {
            "bloque": resp.bloque,
            "elemento_id": resp.elemento_id,
            "valor_sinon": resp.valor_sinon,
            "valor_nivel": resp.valor_nivel,
            "comentario": resp.comentario,
        }

    return {
        "alumno": {
            "nombre_completo": f"{nombre_real} {apellidos_real}",
            "curso": alumno.curso,
            "grupo": alumno.grupo,
        },
        "molde": molde_json,
        "borrador": borrador,
        "rotacion_completada": rotacion.completada,  # Dato clave para el frontend
    }


@router.post("/guardar/{rotacion_id}")
def guardar_respuestas_cuadernillo(
    rotacion_id: str,
    respuestas: List[RespuestaCreate],
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    # --- NUEVO: Bloqueo de seguridad si la rotación ya está finalizada ---
    if rotacion.completada:
        raise HTTPException(
            status_code=400,
            detail="No se pueden guardar cambios: la evaluación ya ha sido finalizada y cerrada.",
        )

    for resp in respuestas:
        respuesta_db = (
            db.query(models.CuadernilloRespuesta)
            .filter(
                models.CuadernilloRespuesta.rotacion_id == rotacion.id,
                models.CuadernilloRespuesta.elemento_id == resp.elemento_id,
            )
            .first()
        )

        if respuesta_db:
            respuesta_db.valor_sinon = resp.valor_sinon
            respuesta_db.valor_nivel = resp.valor_nivel
            respuesta_db.comentario = resp.comentario
            # Asegúrate de que 'modificado_en' existe en tu modelo [cite: 102]
            if hasattr(respuesta_db, "modificado_en"):
                respuesta_db.modificado_en = models.func.now()
        else:
            nueva_respuesta = models.CuadernilloRespuesta(
                rotacion_id=rotacion.id,
                version_cuadernillo=getattr(rotacion, "version_cuadernillo", "2025-v1"),
                bloque=resp.bloque,
                elemento_id=resp.elemento_id,
                valor_sinon=resp.valor_sinon,
                valor_nivel=resp.valor_nivel,
                comentario=resp.comentario,
                rellenado_por=current_user.id,
            )
            db.add(nueva_respuesta)

    db.commit()
    return {"mensaje": "Borrador actualizado correctamente."}


@router.post("/finalizar/{rotacion_id}")
def finalizar_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )

    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    # --- NUEVO: Evitamos finalizar algo que ya está finalizado ---
    if rotacion.completada:
        raise HTTPException(
            status_code=400, detail="Esta rotación ya estaba finalizada."
        )

    rotacion.completada = True  # Cierre definitivo de la evaluación [cite: 100, 122]
    db.commit()

    return {
        "mensaje": "Rotación finalizada correctamente. El alumno ya puede ver su nota."
    }
