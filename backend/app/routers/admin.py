from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, security

router = APIRouter(prefix="/api/v1/admin", tags=["Administración"])


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
