from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, security
from typing import List
import shutil
import os

router = APIRouter(prefix="/api/v1/admin", tags=["Administración"])
UPLOAD_DIR = "cuadernillos"


@router.post("/profesores", response_model=schemas.UsuarioResponse)
def crear_profesor(profesor_in: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    existe = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == profesor_in.email)
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    nuevo_profesor = models.Usuario(
        email=profesor_in.email,
        password_hash=security.get_password_hash(profesor_in.password),
        rol="profesor",
    )
    db.add(nuevo_profesor)
    db.commit()
    db.refresh(nuevo_profesor)
    return nuevo_profesor


# --- NUEVO: GESTIÓN DE ESPECIALIDADES ---


import json


@router.post("/especialidades", response_model=schemas.EspecialidadResponse)
async def crear_especialidad(
    nombre: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un JSON")

    existe = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.nombre == nombre)
        .first()
    )
    if existe:
        raise HTTPException(
            status_code=400, detail="Ya existe una especialidad con este nombre"
        )

    # --- MAGIA: LEEMOS EL ARCHIVO EN MEMORIA ---
    contenido_crudo = await file.read()
    try:
        datos_json = json.loads(contenido_crudo)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400, detail="El archivo JSON está corrupto o mal formateado"
        )

    # --- GUARDAMOS DIRECTAMENTE EN LA BASE DE DATOS ---
    nueva_especialidad = models.Especialidad(
        nombre=nombre,
        contenido_json=datos_json,  # Se guarda como tipo JSON nativo de PostgreSQL
    )
    db.add(nueva_especialidad)
    db.commit()
    db.refresh(nueva_especialidad)

    return nueva_especialidad


@router.get("/especialidades", response_model=List[schemas.EspecialidadResponse])
def listar_especialidades(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    return db.query(models.Especialidad).all()

@router.get("/especialidades/{especialidad_id}")
def obtener_especialidad(
    especialidad_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    # Devolvemos el nombre y el contenido_json
    return {
        "id": str(especialidad.id),
        "nombre": especialidad.nombre,
        "contenido_json": especialidad.contenido_json
    }

@router.put("/especialidades/{especialidad_id}")
def actualizar_especialidad_json(
    especialidad_id: str,
    datos_json: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    # Actualizamos la columna JSON
    especialidad.contenido_json = datos_json
    db.commit()
    
    return {"mensaje": "JSON actualizado correctamente"}

@router.delete("/especialidades/{especialidad_id}")
def eliminar_especialidad(
    especialidad_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    # VALIDACIÓN: Verificar si hay rotaciones usando esta especialidad
    uso_activo = (
        db.query(models.Rotacion)
        .filter(models.Rotacion.especialidad_id == especialidad_id)
        .first()
    )
    if uso_activo:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay alumnos matriculados en esta especialidad.",
        )

    db.delete(especialidad)
    db.commit()
    return {"mensaje": "Especialidad eliminada correctamente"}
