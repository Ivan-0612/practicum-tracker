from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, security
import secrets
from datetime import date, datetime

router = APIRouter(prefix="/api/v1/alumnos", tags=["Alumnos"])


@router.post("/", response_model=schemas.AlumnoResponse)
def crear_alumno(alumno_in: schemas.AlumnoCreate, db: Session = Depends(get_db)):
    tutor = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.email == alumno_in.email_tutor,
            models.Usuario.rol == "profesor",
        )
        .first()
    )
    if not tutor:
        raise HTTPException(
            status_code=404, detail="No existe ningún profesor con ese email"
        )

    # Validar Especialidad
    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == alumno_in.especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(
            status_code=404, detail="La especialidad seleccionada no existe"
        )

    nuevo_usuario = models.Usuario(
        email=alumno_in.email_acceso,
        password_hash=security.get_password_hash(alumno_in.password_acceso),
        rol="estudiante",
    )
    db.add(nuevo_usuario)
    db.flush()

    nuevo_alumno = models.Alumno(
        usuario_id=nuevo_usuario.id,
        curso=alumno_in.curso,
        grupo=alumno_in.grupo,
        numero_rotacion=alumno_in.numero_rotacion,
        codigo_anonimo=f"ALU-{secrets.token_hex(3).upper()}",
        nombre_cifrado=security.cifrar_dato(alumno_in.nombre),
        apellidos_cifrado=security.cifrar_dato(alumno_in.apellidos),
        email_cifrado=security.cifrar_dato(alumno_in.email_personal),
    )
    db.add(nuevo_alumno)
    db.flush()

    # Crear la Rotación con la Especialidad
    nueva_rotacion = models.Rotacion(
        alumno_id=nuevo_alumno.id,
        especialidad_id=especialidad.id,  # <-- NUEVO
        curso=alumno_in.curso,
        numero_rotacion=alumno_in.numero_rotacion,
    )
    db.add(nueva_rotacion)
    db.flush()

    nueva_asignacion = models.AsignacionTutor(
        tutor_id=tutor.id, rotacion_id=nueva_rotacion.id
    )
    db.add(nueva_asignacion)

    db.commit()
    db.refresh(nuevo_alumno)
    return nuevo_alumno


@router.get("/mi-perfil-evaluacion")
def obtener_mi_evaluacion(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "estudiante":
        raise HTTPException(status_code=403, detail="Solo para alumnos")

    alumno = (
        db.query(models.Alumno)
        .filter(models.Alumno.usuario_id == current_user.id)
        .first()
    )
    rotaciones = (
        db.query(models.Rotacion)
        .filter(models.Rotacion.alumno_id == alumno.id)
        .order_by(models.Rotacion.curso, models.Rotacion.numero_rotacion)
        .all()
    )

    hoy = date.today()
    rotaciones_data = []

    for r in rotaciones:
        tutores_emails = [
            asig.tutor.email
            for asig in db.query(models.AsignacionTutor)
            .filter(models.AsignacionTutor.rotacion_id == r.id)
            .all()
        ]

        fichaje_hoy = (
            db.query(models.RegistroAsistencia)
            .filter(
                models.RegistroAsistencia.rotacion_id == r.id,
                models.RegistroAsistencia.fecha == hoy,
            )
            .first()
        )

        # Extraemos el nombre de la especialidad directamente de la base de datos
        nombre_especialidad = (
            r.especialidad.nombre if r.especialidad else "Sin especialidad"
        )

        rotaciones_data.append(
            {
                "id": str(r.id),
                "curso": r.curso if r.curso else alumno.curso,
                "numero": (
                    r.numero_rotacion if r.numero_rotacion else alumno.numero_rotacion
                ),
                "especialidad": nombre_especialidad,  # <-- NUEVO
                "completada": r.completada,
                "tutores": tutores_emails,
                "estado_fichaje_hoy": {
                    "entrada": bool(fichaje_hoy and fichaje_hoy.hora_entrada),
                    "salida": bool(fichaje_hoy and fichaje_hoy.hora_salida),
                },
            }
        )

    return {
        "alumno": {
            "nombre": security.descifrar_dato(alumno.nombre_cifrado),
            "apellidos": security.descifrar_dato(alumno.apellidos_cifrado),
        },
        "rotaciones": rotaciones_data,
    }


@router.get("/")
def listar_alumnos_por_email(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    estudiantes = (
        db.query(models.Usuario, models.Alumno)
        .join(models.Alumno, models.Alumno.usuario_id == models.Usuario.id)
        .filter(models.Usuario.rol == "estudiante")
        .all()
    )

    resultado = []
    for usuario, alumno in estudiantes:
        rotaciones_db = (
            db.query(models.Rotacion)
            .filter(models.Rotacion.alumno_id == alumno.id)
            .order_by(models.Rotacion.curso, models.Rotacion.numero_rotacion)
            .all()
        )

        lista_rotaciones = []
        for rot in rotaciones_db:
            asignaciones = (
                db.query(models.AsignacionTutor)
                .filter(models.AsignacionTutor.rotacion_id == rot.id)
                .all()
            )
            tutores = [a.tutor.email for a in asignaciones]

            lista_rotaciones.append(
                {
                    "id": str(rot.id),
                    "curso": rot.curso or alumno.curso,
                    "numero_rotacion": rot.numero_rotacion or alumno.numero_rotacion,
                    "especialidad": (
                        rot.especialidad.nombre
                        if rot.especialidad
                        else "Sin especialidad"
                    ),  # <-- NUEVO
                    "tutores": tutores,
                }
            )

        resultado.append(
            {
                "id": str(alumno.id),
                "email": usuario.email,
                "curso_actual": alumno.curso,
                "grupo": alumno.grupo,
                "rotaciones": lista_rotaciones,
            }
        )

    return resultado


@router.post("/asignar-rotacion")
def asignar_rotacion_adicional(
    datos: schemas.RotacionCreate,  # <-- Usamos el esquema para recibir especialidad_id
    db: Session = Depends(get_db),
):
    alumno = db.query(models.Alumno).filter(models.Alumno.id == datos.alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == datos.especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    existe = (
        db.query(models.Rotacion)
        .filter(
            models.Rotacion.alumno_id == alumno.id,
            models.Rotacion.curso == datos.curso,
            models.Rotacion.numero_rotacion == datos.numero_rotacion,
        )
        .first()
    )

    if existe:
        raise HTTPException(
            status_code=400,
            detail=f"Error: El alumno ya tiene asignada la Rotación {datos.numero_rotacion} de {datos.curso}º curso.",
        )

    tutor = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.email == datos.email_tutor, models.Usuario.rol == "profesor"
        )
        .first()
    )
    if not tutor:
        raise HTTPException(
            status_code=404, detail="El tutor no existe o no es profesor"
        )

    nueva_rotacion = models.Rotacion(
        alumno_id=alumno.id,
        especialidad_id=especialidad.id,  # <-- NUEVO
        curso=datos.curso,
        numero_rotacion=datos.numero_rotacion,
    )
    db.add(nueva_rotacion)
    db.flush()

    nueva_asig = models.AsignacionTutor(
        tutor_id=tutor.id, rotacion_id=nueva_rotacion.id
    )
    db.add(nueva_asig)
    db.commit()

    return {"mensaje": "Rotación asignada correctamente"}


@router.delete("/rotacion/{rotacion_id}")
def eliminar_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    db.query(models.RegistroAsistencia).filter(
        models.RegistroAsistencia.rotacion_id == rotacion_id
    ).delete()
    db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.rotacion_id == rotacion_id
    ).delete()
    db.query(models.CuadernilloRespuesta).filter(
        models.CuadernilloRespuesta.rotacion_id == rotacion_id
    ).delete()

    db.delete(rotacion)
    db.commit()
    return {"mensaje": "Rotación eliminada"}


@router.delete("/{alumno_id}")
def eliminar_alumno_completo(
    alumno_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    usuario_id = alumno.usuario_id
    rotaciones_ids = [r.id for r in alumno.rotaciones]

    db.query(models.RegistroAsistencia).filter(
        models.RegistroAsistencia.rotacion_id.in_(rotaciones_ids)
    ).delete(synchronize_session=False)
    db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.rotacion_id.in_(rotaciones_ids)
    ).delete(synchronize_session=False)
    db.query(models.CuadernilloRespuesta).filter(
        models.CuadernilloRespuesta.rotacion_id.in_(rotaciones_ids)
    ).delete(synchronize_session=False)
    db.query(models.Rotacion).filter(models.Rotacion.alumno_id == alumno_id).delete()

    db.delete(alumno)
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if usuario:
        db.delete(usuario)

    db.commit()
    return {"mensaje": "Alumno eliminado correctamente"}


@router.post("/fichar")
def fichar_asistencia(
    datos: schemas.AsistenciaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "estudiante":
        raise HTTPException(status_code=403)

    alumno = (
        db.query(models.Alumno)
        .filter(models.Alumno.usuario_id == current_user.id)
        .first()
    )
    rotacion = (
        db.query(models.Rotacion)
        .filter(
            models.Rotacion.id == datos.rotacion_id,
            models.Rotacion.alumno_id == alumno.id,
        )
        .first()
    )

    if not rotacion or rotacion.completada:
        raise HTTPException(status_code=400, detail="Rotación inválida o terminada")

    hoy = date.today()
    ahora = datetime.now()
    registro = (
        db.query(models.RegistroAsistencia)
        .filter(
            models.RegistroAsistencia.rotacion_id == rotacion.id,
            models.RegistroAsistencia.fecha == hoy,
        )
        .first()
    )

    if datos.tipo == "entrada":
        if registro and registro.hora_entrada:
            raise HTTPException(status_code=400, detail="Ya has fichado la entrada hoy")
        if not registro:
            registro = models.RegistroAsistencia(
                rotacion_id=rotacion.id,
                alumno_id=alumno.id,
                fecha=hoy,
                hora_entrada=ahora,
                ubicacion_entrada_permitida=datos.ubicacion_permitida,
                latitud_entrada=datos.latitud,
                longitud_entrada=datos.longitud,
            )
            db.add(registro)

    elif datos.tipo == "salida":
        if not registro or not registro.hora_entrada:
            raise HTTPException(status_code=400, detail="Debes fichar entrada primero")
        if registro.hora_salida:
            raise HTTPException(status_code=400, detail="Ya has fichado la salida hoy")
        registro.hora_salida = ahora
        registro.ubicacion_salida_permitida = datos.ubicacion_permitida
        registro.latitud_salida = datos.latitud
        registro.longitud_salida = datos.longitud

    db.commit()
    return {"mensaje": f"Fichaje de {datos.tipo} registrado"}


@router.get("/asistencia/{rotacion_id}")
def obtener_historial_asistencia_alumno(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    alumno = (
        db.query(models.Alumno)
        .filter(models.Alumno.usuario_id == current_user.id)
        .first()
    )
    return (
        db.query(models.RegistroAsistencia)
        .filter(
            models.RegistroAsistencia.rotacion_id == rotacion_id,
            models.RegistroAsistencia.alumno_id == alumno.id,
        )
        .order_by(models.RegistroAsistencia.fecha.desc())
        .all()
    )
