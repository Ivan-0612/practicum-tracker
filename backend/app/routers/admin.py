from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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
