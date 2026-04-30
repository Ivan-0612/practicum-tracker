from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, security, schemas
from ..utils.periodo_academico_utils import normalizar_periodo_academico

router = APIRouter(prefix="/api/v1/profesores", tags=["Profesores"])

@router.get("/mis-alumnos")
def obtener_mis_alumnos(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="Acceso solo para profesores")

    asignaciones = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.tutor_id == current_user.id)
        .all()
    )

    resultado = []
    for asig in asignaciones:
        rotacion = asig.rotacion
        if not rotacion:
            continue

        alumno = rotacion.alumno
        if not alumno:
            continue

        # 1. Buscamos el usuario para sacar el email de acceso
        usuario_estudiante = (
            db.query(models.Usuario)
            .filter(models.Usuario.id == alumno.usuario_id)
            .first()
        )

        # 2. Desciframos los datos personales
        try:
            nombre = security.descifrar_dato(alumno.nombre_cifrado)
            apellidos = security.descifrar_dato(alumno.apellidos_cifrado)
        except:
            nombre, apellidos = "Error", "Cifrado"

        # 3. Lógica de estados dinámica:
        tiene_respuestas = (
            db.query(models.CuadernilloRespuesta)
            .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
            .first()
            is not None
        )

        hospital_finalize_count = rotacion.hospital_finalize_count or 0

        if rotacion.completada:
            estado = "Completada"
        elif hospital_finalize_count == 1:
            estado = "Pendiente Confirmación Final"
        elif tiene_respuestas:
            estado = "En Proceso"
        else:
            estado = "Pendiente"

        # Extraemos el nombre de la especialidad
        nombre_especialidad = (
            rotacion.especialidad.nombre
            if rotacion.especialidad
            else "Sin especialidad"
        )

        asignaciones_rotacion = (
            db.query(models.AsignacionTutor)
            .filter(models.AsignacionTutor.rotacion_id == rotacion.id)
            .all()
        )
        tutor_hospital_email = None
        tutor_universidad_email = None
        for asignacion_rot in asignaciones_rotacion:
            email_tutor = asignacion_rot.tutor.email if asignacion_rot.tutor else None

            # Compatibilidad con datos antiguos: usamos el tipo de la asignacion o, si falta,
            # el tipo guardado en el perfil del tutor, normalizando formato.
            tipo_tutor = (
                (asignacion_rot.tipo_tutor or "")
                or (getattr(asignacion_rot.tutor, "tipo_tutor", "") if asignacion_rot.tutor else "")
            )
            tipo_tutor = tipo_tutor.strip().lower()

            if "hosp" in tipo_tutor:
                tutor_hospital_email = email_tutor
            elif "uni" in tipo_tutor:
                tutor_universidad_email = email_tutor

        resultado.append(
            {
                "rotacion_id": str(rotacion.id),
                "alumno_id": str(alumno.id),
                "email": (
                    usuario_estudiante.email if usuario_estudiante else "Sin email"
                ),
                "nombre_completo": f"{nombre} {apellidos}",
                "curso": rotacion.curso,
                "numero_rotacion": rotacion.numero_rotacion,
                "especialidad": nombre_especialidad, 
                "grupo": alumno.grupo,
                "completada": rotacion.completada,
                "codigo_anonimo": alumno.codigo_anonimo,
                "estado_evaluacion": estado,
                "hospital_finalize_count": hospital_finalize_count,
                "centro_practicas": rotacion.centro_practicas,
                "periodo_academico": normalizar_periodo_academico(rotacion.periodo_academico),
                "tutor_hospital_email": tutor_hospital_email,
                "tutor_universidad_email": tutor_universidad_email,
                # --- NUEVO: ENVIAMOS EL ROL ESPECÍFICO PARA ESTA ROTACIÓN ---
                "mi_rol": asig.tipo_tutor,
                "nota": rotacion.final_grade_text
            }
        )

    return resultado

@router.get("/asistencia/{rotacion_id}")
def obtener_asistencia_alumno(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="Acceso denegado")

    # Verificamos que el profesor está asignado a esta rotación
    asignacion = db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.tutor_id == current_user.id,
        models.AsignacionTutor.rotacion_id == rotacion_id,
    ).first()

    if not asignacion:
        raise HTTPException(status_code=403, detail="No eres tutor de esta rotación")

    # Obtenemos los registros de asistencia
    fichajes = db.query(models.RegistroAsistencia).filter(
        models.RegistroAsistencia.rotacion_id == rotacion_id
    ).all()
    
    # --- PROCESAMOS LOS DATOS PARA INCLUIR EL EMAIL DEL FIRMANTE ---
    registros_limpios = []
    for f in fichajes:
        # Limpiamos la fecha para evitar problemas de formato (YYYY-MM-DD)
        fecha_str = str(f.fecha).split(" ")[0].split("T")[0] if f.fecha else ""
        
        # Obtenemos el email del tutor que realizó la firma
        # Usamos la relación 'tutor' definida en el modelo RegistroAsistencia
        email_firmante = f.tutor.email if f.tutor else "Tutor Desconocido"
        
        fecha_rec_str = str(f.fecha_recuperada).split(" ")[0] if getattr(f, "fecha_recuperada", None) else None
        registros_limpios.append({
            "id": str(f.id),
            "fecha": fecha_str,
            "firmado_en": f.firmado_en.isoformat() if f.firmado_en else "",
            "firmado_por": email_firmante,
            "fecha_recuperada": fecha_rec_str
        })

    return {
        "es_tutor_universidad": asignacion.tipo_tutor == "universidad",
        "rotacion_completada": asignacion.rotacion.completada, 
        "registros": registros_limpios
    }

from datetime import date, datetime # Asegúrate de importar date
@router.post("/firmar-asistencia")
def firmar_asistencia(
    datos: schemas.AsistenciaCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No autorizado")

    # CORRECCIÓN 1: Permitir el día de hoy (usamos >= para la lógica inversa o > para el error)
    if datos.fecha > date.today():
        raise HTTPException(status_code=400, detail="No puedes firmar una fecha futura")

    # Verificar rol de hospital
    asignacion = db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.tutor_id == current_user.id,
        models.AsignacionTutor.rotacion_id == datos.rotacion_id,
    ).first()

    if not asignacion or (asignacion.tipo_tutor or "").strip().lower() not in ["hospital", "campo"]:
        raise HTTPException(status_code=403, detail="Solo el Tutor del Hospital o de Campo puede firmar")

    # CORRECCIÓN 3: No permitir firmar si la rotación ya está finalizada
    if asignacion.rotacion.completada:
        raise HTTPException(status_code=400, detail="La rotación está cerrada. No se pueden añadir más firmas.")

    # Verificar que no esté ya firmado
    existe = db.query(models.RegistroAsistencia).filter(
        models.RegistroAsistencia.rotacion_id == datos.rotacion_id,
        models.RegistroAsistencia.fecha == datos.fecha
    ).first()
    
    if existe:
        raise HTTPException(status_code=400, detail="Este día ya está firmado")

    # Guardar firma
    nueva_firma = models.RegistroAsistencia(
        rotacion_id=datos.rotacion_id,
        alumno_id=asignacion.rotacion.alumno_id,
        fecha=datos.fecha,
        firmado_por=current_user.id,
        fecha_recuperada=datos.fecha_recuperada
    )
    db.add(nueva_firma)
    db.commit() # Asegura el guardado físico en disco
    return {"mensaje": "Asistencia firmada correctamente"}
@router.get("/asistencia/{rotacion_id}")
def obtener_asistencia_alumno(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="Acceso denegado")

    asignacion = db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.tutor_id == current_user.id,
        models.AsignacionTutor.rotacion_id == rotacion_id,
    ).first()

    if not asignacion:
        raise HTTPException(status_code=403, detail="No eres tutor de esta rotación")

    fichajes = db.query(models.RegistroAsistencia).filter(
        models.RegistroAsistencia.rotacion_id == rotacion_id
    ).all()
    
    # --- AÑADIMOS EL EMAIL DEL FIRMANTE AL RESULTADO ---
    registros_limpios = []
    for f in fichajes:
        fecha_str = str(f.fecha).split(" ")[0].split("T")[0] if f.fecha else ""
        
        # Obtenemos el email del usuario que firmó (si existe)
        email_firmante = f.tutor.email if f.tutor else "Tutor Desconocido"
        
        fecha_rec_str = str(f.fecha_recuperada).split(" ")[0] if getattr(f, "fecha_recuperada", None) else None
        registros_limpios.append({
            "id": str(f.id),
            "fecha": fecha_str,
            "firmado_en": f.firmado_en.isoformat() if f.firmado_en else "",
            "firmado_por": email_firmante,
            "fecha_recuperada": fecha_rec_str
        })

    return {
        "es_tutor_universidad": asignacion.tipo_tutor == "universidad",
        "rotacion_completada": asignacion.rotacion.completada, 
        "registros": registros_limpios
    }