"""
Router público para el flujo de registro del tutor de campo mediante enlace.

El alumno genera un enlace único desde su dashboard.
El enfermero abre ese enlace, introduce su email y (si no tiene cuenta) su contraseña.
No se requiere autenticación previa en ninguno de estos endpoints.
"""
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from .. import security

router = APIRouter(
    prefix="/api/v1/tutores-campo",
    tags=["Tutores de Campo (público)"],
)


# ---------------------------------------------------------------------------
# GET /verificar-token?token=xxx
# Valida que el token sea correcto y devuelve contexto para mostrar al tutor.
# ---------------------------------------------------------------------------
@router.get("/verificar-token", response_model=schemas.VerificarTokenTutorResponse)
def verificar_token(token: str, db: Session = Depends(get_db)):
    invitacion = (
        db.query(models.InvitacionTutorCampo)
        .filter(models.InvitacionTutorCampo.token == token)
        .first()
    )

    if not invitacion:
        return schemas.VerificarTokenTutorResponse(valido=False)

    if invitacion.usado:
        return schemas.VerificarTokenTutorResponse(valido=False, ya_usado=True)

    if invitacion.expira_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        return schemas.VerificarTokenTutorResponse(valido=False)

    rotacion = invitacion.rotacion
    alumno = rotacion.alumno

    try:
        nombre = security.descifrar_dato(alumno.nombre_cifrado)
        apellidos = security.descifrar_dato(alumno.apellidos_cifrado)
        alumno_nombre = f"{nombre} {apellidos}"
    except Exception:
        alumno_nombre = "Alumno"

    especialidad = rotacion.especialidad.nombre if rotacion.especialidad else "Sin especialidad"

    return schemas.VerificarTokenTutorResponse(
        valido=True,
        alumno_nombre=alumno_nombre,
        especialidad=especialidad,
    )


# ---------------------------------------------------------------------------
# POST /verificar-email
# Comprueba si un email ya tiene cuenta en el sistema.
# ---------------------------------------------------------------------------
@router.post("/verificar-email", response_model=schemas.VerificarEmailTutorResponse)
def verificar_email(datos: schemas.VerificarEmailTutorBody, db: Session = Depends(get_db)):
    # Validar token primero
    invitacion = (
        db.query(models.InvitacionTutorCampo)
        .filter(models.InvitacionTutorCampo.token == datos.token)
        .first()
    )
    if not invitacion or invitacion.usado:
        raise HTTPException(status_code=400, detail="El enlace de invitación no es válido o ya fue utilizado.")

    if invitacion.expira_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace de invitación ha expirado.")

    usuario = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    return schemas.VerificarEmailTutorResponse(existe=usuario is not None)


# ---------------------------------------------------------------------------
# POST /registrar
# Vincula al tutor de campo a la rotación.
# Si el email no tiene cuenta, la crea con la contraseña proporcionada.
# Si ya tiene cuenta, simplemente lo asigna a la rotación.
# ---------------------------------------------------------------------------
@router.post("/registrar")
def registrar_tutor_campo(datos: schemas.RegistrarTutorCampoBody, db: Session = Depends(get_db)):
    # 1. Validar token
    invitacion = (
        db.query(models.InvitacionTutorCampo)
        .filter(models.InvitacionTutorCampo.token == datos.token)
        .first()
    )
    if not invitacion:
        raise HTTPException(status_code=400, detail="El enlace de invitación no es válido.")

    if invitacion.usado:
        raise HTTPException(status_code=400, detail="Este enlace ya fue utilizado.")

    if invitacion.expira_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El enlace de invitación ha expirado. Pide al alumno que genere uno nuevo.")

    rotacion = invitacion.rotacion

    # 2. Comprobar que la rotación sigue activa y sin tutor de campo
    if rotacion.completada:
        raise HTTPException(status_code=400, detail="Esta rotación ya está completada.")

    asignacion_existente = (
        db.query(models.AsignacionTutor)
        .filter(
            models.AsignacionTutor.rotacion_id == rotacion.id,
            models.AsignacionTutor.tipo_tutor == "campo",
        )
        .first()
    )
    if asignacion_existente:
        raise HTTPException(status_code=400, detail="Esta rotación ya tiene un tutor de campo asignado.")

    # 3. Buscar o crear usuario
    tutor_usuario = db.query(models.Usuario).filter(models.Usuario.email == datos.email).first()
    es_nuevo = tutor_usuario is None

    if es_nuevo:
        if not datos.password:
            raise HTTPException(
                status_code=422,
                detail="Es necesario crear una contraseña para registrarse."
            )
        tutor_usuario = models.Usuario(
            email=datos.email,
            password_hash=security.get_password_hash(datos.password),
            rol="profesor",
            tipo_tutor="campo",
            registro_completado=True,
            activo=True,
        )
        db.add(tutor_usuario)
        db.flush()

    # 4. Asignar a la rotación
    nueva_asignacion = models.AsignacionTutor(
        tutor_id=tutor_usuario.id,
        rotacion_id=rotacion.id,
        tipo_tutor="campo",
    )
    db.add(nueva_asignacion)

    # 5. Marcar token como usado
    invitacion.usado = True

    db.flush()

    # 6. Obtener datos para emails
    alumno = rotacion.alumno
    try:
        alumno_nombre = f"{security.descifrar_dato(alumno.nombre_cifrado)} {security.descifrar_dato(alumno.apellidos_cifrado)}"
    except Exception:
        alumno_nombre = "Alumno"
    especialidad_nombre = rotacion.especialidad.nombre if rotacion.especialidad else "Sin especialidad"

    db.commit()

    # 7. Notificar a tutores hospital/universidad
    try:
        from ..utils.email_utils import enviar_aviso_nuevo_tutor_campo, enviar_aviso_asignacion_tutor_existente

        asignaciones = (
            db.query(models.AsignacionTutor)
            .filter(
                models.AsignacionTutor.rotacion_id == rotacion.id,
                models.AsignacionTutor.tipo_tutor.in_(["hospital", "universidad"]),
            )
            .all()
        )
        emails_tutores = [a.tutor.email for a in asignaciones]
        if emails_tutores:
            enviar_aviso_nuevo_tutor_campo(emails_tutores, alumno_nombre, especialidad_nombre, datos.email)

        if not es_nuevo:
            enviar_aviso_asignacion_tutor_existente(datos.email, alumno_nombre, especialidad_nombre)
    except Exception:
        pass  # Los emails no deben bloquear el flujo

    return {
        "mensaje": "Te has registrado correctamente como tutor de campo.",
        "es_nuevo": es_nuevo,
    }
