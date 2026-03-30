from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
    # Verificar si el email ya existe
    existe = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == profesor_in.email)
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Crear el usuario con rol profesor
    nuevo_profesor = models.Usuario(
        email=profesor_in.email,
        password_hash=security.get_password_hash(profesor_in.password),
        rol="profesor",
    )

    db.add(nuevo_profesor)
    db.commit()
    db.refresh(nuevo_profesor)
    return nuevo_profesor


@router.post("/upload-json")
async def upload_json_files(
    files: List[UploadFile] = File(...),
    # Aquí deberías incluir tu dependencia de seguridad para verificar que es admin
    # current_user: models.Usuario = Depends(security.get_current_admin)
):
    # Aseguramos que la carpeta existe
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)

    subidos = []
    for file in files:
        if not file.filename.endswith(".json"):
            continue

        file_path = os.path.join(UPLOAD_DIR, file.filename)

        # Guardamos el archivo sobrescribiendo el anterior si existe
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        subidos.append(file.filename)

    return {
        "mensaje": f"Se han actualizado {len(subidos)} archivos",
        "archivos": subidos,
    }
