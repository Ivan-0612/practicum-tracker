from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, security
import secrets

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

    nuevo_usuario = models.Usuario(
        email=alumno_in.email_acceso,
        password_hash=security.get_password_hash(alumno_in.password_acceso),
        rol="estudiante",
    )
    db.add(nuevo_usuario)
    db.flush()

    nuevo_alumno = models.Alumno(
        usuario_id=nuevo_usuario.id,
        # tutor_id YA NO EXISTE AQUÍ
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

    # 4. Crear la Rotación
    nueva_rotacion = models.Rotacion(
        alumno_id=nuevo_alumno.id,
        curso=alumno_in.curso,
        numero_rotacion=alumno_in.numero_rotacion,
    )
    db.add(nueva_rotacion)
    db.flush()

    # --- NUEVO: Enlazar el tutor a la rotación mediante la tabla intermedia ---
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
        raise HTTPException(status_code=403, detail="Acceso solo para alumnos")

    alumno = (
        db.query(models.Alumno)
        .filter(models.Alumno.usuario_id == current_user.id)
        .first()
    )

    # IMPORTANTE: Ordenamos las rotaciones por curso y número para que al alumno le salgan ordenadas
    rotaciones = (
        db.query(models.Rotacion)
        .filter(models.Rotacion.alumno_id == alumno.id)
        .order_by(models.Rotacion.curso, models.Rotacion.numero_rotacion)
        .all()
    )

    rotaciones_data = []
    for r in rotaciones:
        asignaciones = (
            db.query(models.AsignacionTutor)
            .filter(models.AsignacionTutor.rotacion_id == r.id)
            .all()
        )
        tutores_emails = [asig.tutor.email for asig in asignaciones]

        rotaciones_data.append(
            {
                "id": str(r.id),
                # CAMBIO CLAVE: Usamos r.curso y r.numero_rotacion (los de la rotación)
                # Ponemos un 'or' como plan de rescate por si hay datos antiguos vacíos
                "curso": r.curso if r.curso is not None else alumno.curso,
                "numero": (
                    r.numero_rotacion
                    if r.numero_rotacion is not None
                    else alumno.numero_rotacion
                ),
                "completada": r.completada,
                "tutores": tutores_emails,
            }
        )

    return {
        "alumno": {
            "nombre": security.descifrar_dato(alumno.nombre_cifrado),
            "apellidos": security.descifrar_dato(alumno.apellidos_cifrado),
        },
        "rotaciones": rotaciones_data,
    }


@router.post("/asignar-rotacion")
def asignar_rotacion_adicional(
    alumno_id: str,
    email_tutor: str,
    curso: int,  # <-- ¡NUEVO! Atrapa el curso del frontend
    numero_rotacion: int,  # <-- ¡NUEVO! Atrapa el numero del frontend
    db: Session = Depends(get_db),
):
    # 1. Verificar que el alumno existe
    alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    # 2. Buscar al nuevo tutor
    tutor = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == email_tutor, models.Usuario.rol == "profesor")
        .first()
    )
    if not tutor:
        raise HTTPException(status_code=404, detail="El tutor no existe")

    # 3. Crear la nueva Rotación guardando el curso y el número correctos
    nueva_rotacion = models.Rotacion(
        alumno_id=alumno.id,
        curso=curso,  # <-- ¡NUEVO! Lo guardamos en la BD
        numero_rotacion=numero_rotacion,  # <-- ¡NUEVO! Lo guardamos en la BD
    )
    db.add(nueva_rotacion)
    db.flush()  # Para obtener el ID de la rotación antes del commit

    # 4. Crear el vínculo en la tabla intermedia
    nueva_asig = models.AsignacionTutor(
        tutor_id=tutor.id, rotacion_id=nueva_rotacion.id
    )
    db.add(nueva_asig)
    db.commit()

    return {"mensaje": "Nueva rotación asignada con éxito"}


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
        # Buscamos todas las rotaciones de este alumno
        rotaciones_db = (
            db.query(models.Rotacion)
            .filter(models.Rotacion.alumno_id == alumno.id)
            .order_by(models.Rotacion.curso, models.Rotacion.numero_rotacion)
            .all()
        )

        lista_rotaciones = []
        for rot in rotaciones_db:
            # Buscamos los tutores de cada rotación
            asignaciones = (
                db.query(models.AsignacionTutor)
                .filter(models.AsignacionTutor.rotacion_id == rot.id)
                .all()
            )
            tutores = [a.tutor.email for a in asignaciones]

            lista_rotaciones.append(
                {
                    "id": str(rot.id),
                    "curso": rot.curso
                    or alumno.curso,  # Fallback por si hay rotaciones antiguas
                    "numero_rotacion": rot.numero_rotacion or alumno.numero_rotacion,
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
    alumno_id: str,
    email_tutor: str,
    curso: int,
    numero_rotacion: int,
    db: Session = Depends(get_db),
):
    # 1. ¿Existe el alumno?
    alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    # 2. ¿EXISTE YA ESTA ROTACIÓN PARA ESTE ALUMNO? (EL BLOQUEO)
    # Buscamos en la tabla rotaciones si ese alumno ya tiene ese curso y ese número
    existe = (
        db.query(models.Rotacion)
        .filter(
            models.Rotacion.alumno_id == alumno.id,
            models.Rotacion.curso == curso,
            models.Rotacion.numero_rotacion == numero_rotacion,
        )
        .first()
    )

    if existe:
        # Si existe, lanzamos un error 400 (Bad Request)
        raise HTTPException(
            status_code=400,
            detail=f"Error: El alumno ya tiene asignada la Rotación {numero_rotacion} de {curso}º curso.",
        )

    # 3. ¿Existe el tutor?
    tutor = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == email_tutor, models.Usuario.rol == "profesor")
        .first()
    )

    if not tutor:
        raise HTTPException(
            status_code=404, detail="El tutor no existe o no es profesor"
        )

    # 4. Si todo es correcto, creamos
    nueva_rotacion = models.Rotacion(
        alumno_id=alumno.id, curso=curso, numero_rotacion=numero_rotacion
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

    # Borrar dependencias (evaluaciones y asignaciones)
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
    # Verificación de seguridad
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    # 1. Buscar el perfil del alumno
    alumno = db.query(models.Alumno).filter(models.Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado")

    usuario_id = alumno.usuario_id

    # 2. Limpiar dependencias en cascada manualmente
    # Buscamos todas las rotaciones del alumno
    rotaciones_ids = [r.id for r in alumno.rotaciones]

    # Borrar asignaciones de tutores y respuestas de esas rotaciones
    db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.rotacion_id.in_(rotaciones_ids)
    ).delete(synchronize_session=False)
    db.query(models.CuadernilloRespuesta).filter(
        models.CuadernilloRespuesta.rotacion_id.in_(rotaciones_ids)
    ).delete(synchronize_session=False)

    # Borrar las rotaciones
    db.query(models.Rotacion).filter(models.Rotacion.alumno_id == alumno_id).delete()

    # Borrar el perfil del alumno
    db.delete(alumno)

    # 3. Borrar el usuario de acceso (la cuenta de login)
    usuario = db.query(models.Usuario).filter(models.Usuario.id == usuario_id).first()
    if usuario:
        db.delete(usuario)

    db.commit()
    return {"mensaje": "Alumno y todos sus datos eliminados correctamente"}
