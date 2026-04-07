from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, security, schemas

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

        if rotacion.completada:
            estado = "Completada"
        elif tiene_respuestas:
            estado = "En Proceso"
        else:
            estado = "Pendiente"

        # --- NUEVO: Extraemos el nombre de la especialidad ---
        nombre_especialidad = (
            rotacion.especialidad.nombre
            if rotacion.especialidad
            else "Sin especialidad"
        )

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
                "especialidad": nombre_especialidad,  # <--- AÑADIMOS ESTO AQUÍ
                "grupo": alumno.grupo,
                "completada": rotacion.completada,
                "codigo_anonimo": alumno.codigo_anonimo,
                "estado_evaluacion": estado,
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

    asignacion = db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.tutor_id == current_user.id,
        models.AsignacionTutor.rotacion_id == rotacion_id,
    ).first()

    if not asignacion:
        raise HTTPException(status_code=403, detail="No eres tutor de esta rotación")

    fichajes = db.query(models.RegistroAsistencia).filter(
        models.RegistroAsistencia.rotacion_id == rotacion_id
    ).all()
    
    # --- SOLUCIÓN: LIMPIEZA MANUAL DEL FORMATO DE FECHA ---
    registros_limpios = []
    for f in fichajes:
        # Convertimos a string y cortamos por la 'T' o el espacio vacío para quedarnos solo con YYYY-MM-DD
        fecha_str = str(f.fecha).split(" ")[0].split("T")[0] if f.fecha else ""
        registros_limpios.append({
            "id": str(f.id),
            "fecha": fecha_str,
            "firmado_en": f.firmado_en.isoformat() if f.firmado_en else ""
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

    if not asignacion or asignacion.tipo_tutor != "hospital":
        raise HTTPException(status_code=403, detail="Solo el Tutor del Hospital puede firmar")

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
        firmado_por=current_user.id
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
    
    # CORRECCIÓN: Devolvemos si la rotación está completada
    return {
        "es_tutor_universidad": asignacion.tipo_tutor == "universidad",
        "rotacion_completada": asignacion.rotacion.completada, 
        "registros": fichajes
    }