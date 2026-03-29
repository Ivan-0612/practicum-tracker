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
    current_user: models.Usuario = Depends(security.get_current_user)
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    # 1. Buscamos la rotación
    rotacion = db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    # 2. Buscamos al alumno
    alumno = db.query(models.Alumno).filter(models.Alumno.id == rotacion.alumno_id).first()

    # 3. Construimos el nombre del archivo JSON
    nombre_archivo = f"curso{alumno.curso}-rotacion{alumno.numero_rotacion}.json"
    ruta_archivo = os.path.join(os.getcwd(), "cuadernillos", nombre_archivo)

    # 4. Leemos el archivo JSON
    try:
        with open(ruta_archivo, 'r', encoding='utf-8') as f:
            molde_json = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"No se encontró el archivo {nombre_archivo} en el servidor.")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"El archivo {nombre_archivo} existe pero no tiene un formato JSON válido.")

    # 5. Desciframos datos del alumno
    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)

    # --- NUEVO: BUSCAMOS SI YA HAY UN BORRADOR GUARDADO ---
    respuestas_db = db.query(models.CuadernilloRespuesta).filter(
        models.CuadernilloRespuesta.rotacion_id == rotacion.id
    ).all()
    
    # Lo convertimos en un diccionario fácil de leer para React (clave: elemento_id)
    borrador = {}
    for resp in respuestas_db:
        borrador[resp.elemento_id] = {
            "bloque": resp.bloque,
            "elemento_id": resp.elemento_id,
            "valor_sinon": resp.valor_sinon,
            "valor_nivel": resp.valor_nivel,
            "comentario": resp.comentario
        }

    # 6. Enviamos TODO junto al frontend
    return {
        "alumno": {
            "nombre_completo": f"{nombre_real} {apellidos_real}",
            "curso": alumno.curso,
            "grupo": alumno.grupo
        },
        "molde": molde_json,
        "borrador": borrador # <--- AQUÍ ENVIAMOS LAS RESPUESTAS GUARDADAS
    }

@router.post("/guardar/{rotacion_id}")
def guardar_respuestas_cuadernillo(
    rotacion_id: str,
    respuestas: List[RespuestaCreate], # Recibimos una lista de respuestas desde React
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user)
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    # Verificamos que la rotación existe
    rotacion = db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    # Recorremos cada respuesta que nos manda el frontend
    for resp in respuestas:
        # Buscamos si ya existe una respuesta para esta pregunta exacta
        respuesta_db = db.query(models.CuadernilloRespuesta).filter(
            models.CuadernilloRespuesta.rotacion_id == rotacion.id,
            models.CuadernilloRespuesta.elemento_id == resp.elemento_id
        ).first()

        if respuesta_db:
            # Si ya existía, la ACTUALIZAMOS (Upsert)
            respuesta_db.valor_sinon = resp.valor_sinon
            respuesta_db.valor_nivel = resp.valor_nivel
            respuesta_db.comentario = resp.comentario
            respuesta_db.modificado_en = models.func.now()
        else:
            # Si no existía, la CREAMOS
            nueva_respuesta = models.CuadernilloRespuesta(
                rotacion_id=rotacion.id,
                version_cuadernillo=rotacion.version_cuadernillo if hasattr(rotacion, 'version_cuadernillo') else "2025-v1", # Ajusta esto según cómo guardes la versión
                bloque=resp.bloque,
                elemento_id=resp.elemento_id,
                valor_sinon=resp.valor_sinon,
                valor_nivel=resp.valor_nivel,
                comentario=resp.comentario,
                rellenado_por=current_user.id
            )
            db.add(nueva_respuesta)

    db.commit()
    return {"mensaje": f"Se han guardado {len(respuestas)} respuestas correctamente."}


@router.post("/finalizar/{rotacion_id}")
def finalizar_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user)
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    # ¡LA MAGIA OCURRE AQUÍ!
    rotacion.completada = True
    db.commit()

    return {"mensaje": "Rotación finalizada correctamente. El alumno ya puede ver su nota."}