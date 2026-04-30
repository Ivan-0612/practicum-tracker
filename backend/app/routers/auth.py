from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from ..database import get_db
from .. import models, security, schemas  # Importaciones limpias
import secrets
from sqlalchemy import func
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
import os
from dotenv import load_dotenv
from ..utils.periodo_academico_utils import normalizar_periodo_academico

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

router = APIRouter(prefix="/api/v1/auth", tags=["Autenticación"])
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
# Configuración de Gmail (Fuera de las funciones para que sea global)
load_dotenv()  # Carga las variables del archivo .env

conf = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
    MAIL_FROM=os.getenv("MAIL_FROM"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True,
)


@router.post("/login")
@limiter.limit("5/minute")  # <--- EL ESCUDO ANTI-ATAQUES POR IP ESTÁ ACTIVO
def login(
    request: Request,  # <--- SlowAPI necesita esto obligatoriamente
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == form_data.username)
        .first()
    )

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    registro_intentos = (
        db.query(models.IntentoLogin)
        .filter(models.IntentoLogin.email == usuario.email)
        .first()
    )

    if registro_intentos and registro_intentos.bloqueado_hasta:
        if datetime.now(timezone.utc) < registro_intentos.bloqueado_hasta.replace(
            tzinfo=timezone.utc
        ):
            tiempo_restante = (
                registro_intentos.bloqueado_hasta.replace(tzinfo=timezone.utc)
                - datetime.now(timezone.utc)
            ).seconds // 60
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Cuenta bloqueada temporalmente. Inténtalo en {tiempo_restante + 1} minutos.",
            )

    if not security.verify_password(form_data.password, usuario.password_hash):
        if not registro_intentos:
            registro_intentos = models.IntentoLogin(
                email=usuario.email, usuario_id=usuario.id, intentos=1
            )
            db.add(registro_intentos)
        else:
            registro_intentos.intentos += 1
            if registro_intentos.intentos >= security.MAX_INTENTOS:
                registro_intentos.bloqueado_hasta = datetime.now(
                    timezone.utc
                ) + timedelta(minutes=security.MINUTOS_BLOQUEO)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    if not usuario.activo:
        raise HTTPException(status_code=400, detail="Esta cuenta está desactivada")

    if usuario.rol == "estudiante" and not usuario.registro_completado:
        raise HTTPException(
            status_code=403,
            detail="Tu cuenta está pendiente de registro. Completa el alta desde la pantalla de registro.",
        )

    # Si el login es correcto, reseteamos los intentos fallidos
    if registro_intentos:
        registro_intentos.intentos = 0
        registro_intentos.bloqueado_hasta = None
        db.commit()

    # Generamos el token de sesión
    access_token = security.create_access_token(
        data={"sub": str(usuario.id), "rol": usuario.rol}
    )

    # VOLVEMOS AL MÉTODO CLÁSICO: Devolvemos el token directamente en el JSON
    return {"access_token": access_token, "token_type": "bearer", "rol": usuario.rol}


@router.post("/registro/verificar-email")
def verificar_email_registro(
    datos: schemas.RegistroVerificarEmailRequest,
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == datos.email, models.Usuario.rol == "estudiante")
        .first()
    )

    if not usuario or not usuario.activo:
        raise HTTPException(
            status_code=403,
            detail="Este correo no está autorizado para registrarse. Contacta con administración.",
        )

    alumno_existente = (
        db.query(models.Alumno)
        .filter(models.Alumno.usuario_id == usuario.id)
        .first()
    )
    if usuario.registro_completado or alumno_existente:
        raise HTTPException(
            status_code=400,
            detail="Este correo ya tiene una cuenta completada. Usa el login.",
        )

    especialidades = db.query(models.Especialidad).order_by(models.Especialidad.nombre).all()
    centros = (
        db.query(models.CentroPracticas)
        .filter(models.CentroPracticas.activo == True)
        .order_by(models.CentroPracticas.nombre)
        .all()
    )

    return {
        "permitido": True,
        "especialidades": [
            {"id": str(esp.id), "nombre": esp.nombre}
            for esp in especialidades
        ],
        "centros": [
            {
                "id": str(c.id),
                "nombre": c.nombre,
                "tutor_hospital_email": c.tutor_hospital.email if c.tutor_hospital else "",
                "tutor_universidad_email": c.tutor_universidad.email if c.tutor_universidad else "",
            }
            for c in centros
        ],
    }


@router.post("/registro/completar")
def completar_registro_alumno(
    datos: schemas.RegistroCompletarRequest,
    db: Session = Depends(get_db),
):
    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == datos.email, models.Usuario.rol == "estudiante")
        .first()
    )
    if not usuario or not usuario.activo:
        raise HTTPException(status_code=403, detail="Correo no autorizado")

    if usuario.registro_completado:
        raise HTTPException(status_code=400, detail="La cuenta ya está registrada")

    if (
        db.query(models.Alumno)
        .filter(models.Alumno.usuario_id == usuario.id)
        .first()
    ):
        raise HTTPException(status_code=400, detail="El alumno ya está creado")

    centro = (
        db.query(models.CentroPracticas)
        .filter(
            models.CentroPracticas.id == datos.centro_practicas_id,
            models.CentroPracticas.activo == True,
        )
        .first()
    )
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado")

    if not centro.tutor_hospital_id or not centro.tutor_universidad_id:
        raise HTTPException(
            status_code=400,
            detail="El centro no tiene tutores configurados",
        )

    periodo_academico = normalizar_periodo_academico(datos.periodo_academico)

    nuevo_alumno = models.Alumno(
        usuario_id=usuario.id,
        curso=datos.curso,
        grupo=datos.grupo,
        numero_rotacion=datos.numero_rotacion,
        codigo_anonimo=f"ALU-{secrets.token_hex(3).upper()}",
        nombre_cifrado=security.cifrar_dato(datos.nombre),
        apellidos_cifrado=security.cifrar_dato(datos.apellidos),
        email_cifrado=security.cifrar_dato(datos.email_personal or datos.email),
    )
    db.add(nuevo_alumno)
    db.flush()

    nueva_rotacion = models.Rotacion(
        alumno_id=nuevo_alumno.id,
        especialidad_id=datos.especialidad_id,
        curso=datos.curso,
        numero_rotacion=datos.numero_rotacion,
        periodo_academico=periodo_academico,
        centro_practicas=centro.nombre,
    )
    db.add(nueva_rotacion)
    db.flush()

    db.add(
        models.AsignacionTutor(
            tutor_id=centro.tutor_hospital_id,
            rotacion_id=nueva_rotacion.id,
            tipo_tutor="hospital",
        )
    )
    db.add(
        models.AsignacionTutor(
            tutor_id=centro.tutor_universidad_id,
            rotacion_id=nueva_rotacion.id,
            tipo_tutor="universidad",
        )
    )

    usuario.password_hash = security.get_password_hash(datos.password)
    usuario.registro_completado = True
    usuario.curso_pendiente = None

    db.commit()

    access_token = security.create_access_token(
        data={"sub": str(usuario.id), "rol": usuario.rol}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "rol": usuario.rol,
        "mensaje": "Registro completado correctamente",
    }


@router.post("/cambiar-password")
def cambiar_password(
    datos: schemas.CambioPassword,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if datos.nueva_password != datos.confirmar_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")
    if not security.verify_password(datos.password_actual, current_user.password_hash):
        raise HTTPException(
            status_code=400, detail="La contraseña actual es incorrecta"
        )
    current_user.password_hash = security.get_password_hash(datos.nueva_password)
    db.commit()
    return {"mensaje": "Contraseña actualizada"}


# --- CAMBIO IMPORTANTE AQUÍ: Función ASYNC y envío real ---
@router.post("/recuperar-password/solicitar")
async def solicitar_recuperacion(
    datos: schemas.SolicitarRecuperacion, db: Session = Depends(get_db)
):
    usuario = (
        db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    )

    if usuario:
        token_hex = secrets.token_urlsafe(32)
        nuevo_token = models.TokenRecuperacion(
            usuario_id=usuario.id,
            token=token_hex,
            expira_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(nuevo_token)
        db.commit()

        # Lógica de envío de email
        enlace = f"{frontend_url}/restablecer-password?token={token_hex}"
        cuerpo = f"""
        <html>
            <body>
                <p>Has solicitado restablecer tu contraseña en <b>Practicum Tracker</b>.</p>
                <p>Haz clic en el siguiente enlace para continuar:</p>
                <a href="{enlace}">{enlace}</a>
                <p>Este enlace caducará en 30 minutos.</p>
            </body>
        </html>
        """
        message = MessageSchema(
            subject="Recuperación de contraseña - Practicum Tracker",
            recipients=[usuario.email],
            body=cuerpo,
            subtype=MessageType.html,
        )
        fm = FastMail(conf)
        await fm.send_message(message)

    return {"mensaje": "Si el email existe, recibirás un enlace"}


@router.post("/recuperar-password/confirmar")
def confirmar_restablecimiento(
    datos: schemas.RestablecerPassword, db: Session = Depends(get_db)
):
    registro = (
        db.query(models.TokenRecuperacion)
        .filter(
            models.TokenRecuperacion.token == datos.token,
            models.TokenRecuperacion.usado == False,
        )
        .first()
    )

    if not registro or registro.expira_at.replace(tzinfo=timezone.utc) < datetime.now(
        timezone.utc
    ):
        raise HTTPException(status_code=400, detail="Token inválido o expirado")

    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.id == registro.usuario_id)
        .first()
    )
    usuario.password_hash = security.get_password_hash(datos.nueva_password)
    usuario.registro_completado = True
    registro.usado = True
    db.commit()
    return {"mensaje": "Contraseña restablecida con éxito"}
