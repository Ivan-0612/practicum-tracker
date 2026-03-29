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

    alumno = rotacion.alumno
    nombre_archivo = f"curso{alumno.curso}-rotacion{alumno.numero_rotacion}.json"

    # Lógica de rutas para encontrar el JSON
    base_path = os.getcwd()
    ruta_archivo = os.path.join(base_path, "cuadernillos", nombre_archivo)
    if not os.path.exists(ruta_archivo):
        ruta_archivo = os.path.join(base_path, "app", "cuadernillos", nombre_archivo)

    try:
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            molde_json = json.load(f)
    except Exception:
        raise HTTPException(
            status_code=404, detail=f"No se encontró el archivo {nombre_archivo}"
        )

    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)

    respuestas_db = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .all()
    )

    borrador = {}
    if current_user.rol == "profesor" or (
        current_user.rol == "estudiante" and rotacion.completada
    ):
        for resp in respuestas_db:
            borrador[resp.elemento_id] = {
                "bloque": resp.bloque,
                "elemento_id": resp.elemento_id,
                "valor_sinon": resp.valor_sinon,
                "valor_nivel": resp.valor_nivel,
                "comentario": resp.comentario,
            }
    else:
        # Si es estudiante y no está completada, el borrador se envía vacío
        borrador = {}

    asignaciones = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.rotacion_id == rotacion.id)
        .all()
    )
    tutores = [asig.tutor.email for asig in asignaciones]

    return {
        "alumno": {
            "nombre_completo": f"{nombre_real} {apellidos_real}",
            "curso": alumno.curso,
            "grupo": alumno.grupo,
        },
        "molde": molde_json,
        "borrador": borrador,
        "rotacion_completada": rotacion.completada,
        "tutores": tutores,
    }


@router.post("/guardar/{rotacion_id}")
def guardar_respuestas_cuadernillo(
    rotacion_id: str,
    respuestas: List[RespuestaCreate],
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    """
    ESTE ES EL ENDPOINT PARA EL BORRADOR.
    No valida si está todo completo, solo guarda lo que envíes.
    """
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion or rotacion.completada:
        raise HTTPException(
            status_code=400, detail="La rotación no existe o ya está cerrada"
        )

    for resp in respuestas:
        # Buscar si ya existe la respuesta para actualizarla, si no, crearla
        db_resp = (
            db.query(models.CuadernilloRespuesta)
            .filter(
                models.CuadernilloRespuesta.rotacion_id == rotacion.id,
                models.CuadernilloRespuesta.elemento_id == resp.elemento_id,
            )
            .first()
        )

        if db_resp:
            db_resp.valor_sinon = resp.valor_sinon
            db_resp.valor_nivel = resp.valor_nivel
            db_resp.comentario = resp.comentario
        else:
            nueva_resp = models.CuadernilloRespuesta(
                rotacion_id=rotacion.id,
                version_cuadernillo="2025-v1",
                bloque=resp.bloque,
                elemento_id=resp.elemento_id,
                valor_sinon=resp.valor_sinon,
                valor_nivel=resp.valor_nivel,
                comentario=resp.comentario,
                rellenado_por=current_user.id,
            )
            db.add(nueva_resp)

    db.commit()
    return {"mensaje": "Borrador guardado correctamente"}


@router.post("/finalizar/{rotacion_id}")
def finalizar_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    """
    ESTE ES EL ENDPOINT DE CIERRE.
    Aquí sí validamos que todo esté relleno antes de poner completada = True.
    """
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion or rotacion.completada:
        raise HTTPException(
            status_code=400, detail="Rotación no encontrada o ya finalizada"
        )

    # --- Lógica de validación de integridad ---
    alumno = rotacion.alumno
    nombre_archivo = f"curso{alumno.curso}-rotacion{alumno.numero_rotacion}.json"
    base_path = os.getcwd()
    ruta_archivo = os.path.join(base_path, "cuadernillos", nombre_archivo)
    if not os.path.exists(ruta_archivo):
        ruta_archivo = os.path.join(base_path, "app", "cuadernillos", nombre_archivo)

    try:
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            molde = json.load(f)

        total_esperado = len(molde["bloque_sinon"]["elementos"])
        for apartado in molde["apartados"]:
            total_esperado += len(apartado["elementos"])

        total_real = (
            db.query(models.CuadernilloRespuesta)
            .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
            .count()
        )

        if total_real < total_esperado:
            raise HTTPException(
                status_code=400,
                detail=f"Incompleto: faltan {total_esperado - total_real} campos.",
            )

        # Si está todo, cerramos
        rotacion.completada = True
        db.commit()
        return {"mensaje": "Evaluación finalizada con éxito"}

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No se pudo validar el molde")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
