from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from ..database import get_db
from .. import models, security

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    # 1. Buscamos al usuario en la BD
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == form_data.username)
        .first()
    )

    # Si el usuario no existe, lanzamos error genérico inmediatamente
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    # 2. VERIFICAR BLOQUEO: ¿Ha fallado demasiadas veces?
    # Buscamos si hay un registro de intentos para este usuario
    registro_intentos = (
        db.query(models.IntentoLogin)
        .filter(models.IntentoLogin.email == usuario.email)
        .first()
    )

    if registro_intentos and registro_intentos.bloqueado_hasta:
        # Si tiene fecha de bloqueo y aún no ha pasado el tiempo...
        if datetime.now(timezone.utc) < registro_intentos.bloqueado_hasta.replace(
            tzinfo=timezone.utc
        ):
            tiempo_restante = (
                registro_intentos.bloqueado_hasta.replace(tzinfo=timezone.utc)
                - datetime.now(timezone.utc)
            ).seconds // 60
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cuenta bloqueada temporalmente por seguridad. Inténtalo de nuevo en {tiempo_restante + 1} minutos.",
            )

    # 3. VERIFICAR CONTRASEÑA
    if not security.verify_password(form_data.password, usuario.password_hash):
        # FALLO: Gestionar contador de intentos
        if not registro_intentos:
            registro_intentos = models.IntentoLogin(
                email=usuario.email, usuario_id=usuario.id, intentos=1
            )
            db.add(registro_intentos)
        else:
            registro_intentos.intentos += 1
            # Si llega al límite (ej: 5), bloqueamos por 15 min
            if registro_intentos.intentos >= security.MAX_INTENTOS:
                registro_intentos.bloqueado_hasta = datetime.now(
                    timezone.utc
                ) + timedelta(minutes=security.MINUTOS_BLOQUEO)

        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    # 4. LOGIN CORRECTO
    if not usuario.activo:
        raise HTTPException(status_code=400, detail="Esta cuenta está desactivada")

    # Si el login es exitoso, reseteamos el contador de intentos
    if registro_intentos:
        registro_intentos.intentos = 0
        registro_intentos.bloqueado_hasta = None
        db.commit()

    # 5. Generar Token JWT
    access_token = security.create_access_token(
        data={"sub": str(usuario.id), "rol": usuario.rol}
    )

    return {"access_token": access_token, "token_type": "bearer", "rol": usuario.rol}
