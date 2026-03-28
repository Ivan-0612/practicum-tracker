from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Usuario
from ..security import verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # 1. Buscamos al usuario en la BD (OAuth2 usa 'username' para el campo del email)
    usuario = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    # 2. Si no existe o la contraseña no cuadra, lanzamos el error genérico por seguridad
    if not usuario or not verify_password(form_data.password, usuario.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Comprobamos que no esté desactivado
    if not usuario.activo:
        raise HTTPException(status_code=400, detail="Esta cuenta está desactivada")

    # 4. Si todo es correcto, creamos el token metiendo su ID y su rol dentro
    access_token = create_access_token(
        data={"sub": str(usuario.id), "rol": usuario.rol}
    )

    return {"access_token": access_token, "token_type": "bearer", "rol": usuario.rol}
