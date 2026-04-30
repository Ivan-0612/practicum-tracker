from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Body
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models, schemas, security
from typing import List
import shutil
import os
from io import BytesIO
from ..utils.periodo_academico_utils import normalizar_periodo_academico
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from ..utils.excel_utils import (
    borrar_plantilla_excel,
    generar_excel_evaluado,
    subir_plantilla_excel,
)
from ..utils.especialidad_json_utils import (
    canonicalize_nic_section,
    canonicalize_uc_section,
    compose_molde_with_global_nic,
    validate_nic_section,
    validate_uc_section_equal,
)
from ..utils.mapping_global_utils import ensure_global_mapping
from ..utils.unidades_competencia_global_utils import ensure_global_uc, set_global_uc

router = APIRouter(prefix="/api/v1/admin", tags=["Administración"])
UPLOAD_DIR = "cuadernillos"


@router.get("/alumnos/pendientes")
def listar_alumnos_pendientes(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    query = db.query(models.Usuario).filter(
        models.Usuario.rol == "estudiante",
        models.Usuario.registro_completado == False,
    )

    pendientes = query.order_by(models.Usuario.creado_en.desc()).all()

    return {
        "total": len(pendientes),
        "resultados": [
            {
                "id": str(u.id),
                "email": u.email,
                "creado_en": u.creado_en.isoformat() if u.creado_en else None,
            }
            for u in pendientes
        ],
    }


@router.post("/profesores", response_model=schemas.UsuarioResponse)
def crear_profesor(profesor_in: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    existe = (
        db.query(models.Usuario)
        .filter(models.Usuario.email == profesor_in.email)
        .first()
    )
    if existe:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    tipo_tutor = (profesor_in.tipo_tutor or "").strip().lower()
    if tipo_tutor not in ["hospital", "universidad"]:
        raise HTTPException(
            status_code=400,
            detail="Debes indicar un tipo_tutor válido: 'hospital' o 'universidad'",
        )

    nuevo_profesor = models.Usuario(
        email=profesor_in.email,
        password_hash=security.get_password_hash(profesor_in.password),
        rol="profesor",
        tipo_tutor=tipo_tutor,
    )
    db.add(nuevo_profesor)
    db.commit()
    db.refresh(nuevo_profesor)
    return nuevo_profesor


# --- NUEVO: GESTIÓN DE ESPECIALIDADES ---


import json


@router.post("/especialidades", response_model=schemas.EspecialidadResponse)
async def crear_especialidad(
    nombre: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol not in ["admin", "profesor"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un JSON")

    existe = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.nombre == nombre)
        .first()
    )
    if existe:
        raise HTTPException(
            status_code=400, detail="Ya existe una especialidad con este nombre"
        )

    # --- MAGIA: LEEMOS EL ARCHIVO EN MEMORIA ---
    contenido_crudo = await file.read()
    try:
        datos_json = json.loads(contenido_crudo)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400, detail="El archivo JSON está corrupto o mal formateado"
        )

    ok_nic, mensaje_nic = validate_nic_section(datos_json)
    if not ok_nic:
        raise HTTPException(status_code=400, detail=mensaje_nic)

    # Guardamos exclusivamente NIC por especialidad.
    datos_nic = canonicalize_nic_section(datos_json)

    # --- GUARDAMOS DIRECTAMENTE EN LA BASE DE DATOS ---
    nueva_especialidad = models.Especialidad(
        nombre=nombre,
        contenido_json=datos_nic,
    )
    db.add(nueva_especialidad)
    db.commit()
    db.refresh(nueva_especialidad)

    return nueva_especialidad


@router.post("/especialidades/{especialidad_id}/plantilla-excel")
async def subir_plantilla_excel_especialidad(
    especialidad_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    if not file.filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="El archivo debe ser XLSX")

    contenido = await file.read()
    if not contenido:
        raise HTTPException(status_code=400, detail="El archivo está vacío")

    storage_path = f"especialidades/{especialidad_id}/plantilla.xlsx"
    try:
        subir_plantilla_excel(storage_path, contenido)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    especialidad.plantilla_excel_storage_path = storage_path
    db.commit()

    return {
        "mensaje": "Plantilla XLSX guardada correctamente",
        "especialidad_id": str(especialidad.id),
        "storage_path": storage_path,
    }


@router.get("/especialidades/{especialidad_id}/plantilla-excel")
def obtener_plantilla_excel_especialidad(
    especialidad_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    # Obtener mapping global
    mapping_global = (
        db.query(models.PlantillaExcelMappingGlobal)
        .order_by(models.PlantillaExcelMappingGlobal.id)
        .first()
    )

    return {
        "especialidad_id": str(especialidad.id),
        "has_template": bool(especialidad.plantilla_excel_storage_path),
        "storage_path": especialidad.plantilla_excel_storage_path,
        "mapping_json": mapping_global.mapping_json if mapping_global else {},
    }


# Endpoints de mapping GLOBAL (compartido por todas las especialidades)

@router.get("/plantilla-excel/mapping")
def obtener_mapping_global(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    mapping_json = ensure_global_mapping(db)

    return {
        "mapping_json": mapping_json,
        "existe": bool(mapping_json),
    }


@router.get("/unidades-competencia/global")
def obtener_unidades_competencia_global(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    uc_json = ensure_global_uc(db)
    return {"uc_json": uc_json, "existe": bool(uc_json.get("apartados"))}


@router.put("/unidades-competencia/global")
def actualizar_unidades_competencia_global(
    uc_json: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    ok_uc, mensaje_uc = validate_uc_section_equal(uc_json)
    if not ok_uc:
        raise HTTPException(status_code=400, detail=mensaje_uc)

    cleaned = canonicalize_uc_section(uc_json)
    set_global_uc(db, cleaned)
    return {"mensaje": "UC global actualizada correctamente", "uc_json": cleaned}


@router.post("/plantilla-excel/mapping")
def crear_mapping_global(
    mapping_json: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    if not isinstance(mapping_json, dict):
        raise HTTPException(status_code=400, detail="El mapping debe ser un objeto JSON")

    # Si ya existe, reemplazalo
    mapping_existente = (
        db.query(models.PlantillaExcelMappingGlobal)
        .order_by(models.PlantillaExcelMappingGlobal.id)
        .first()
    )

    if mapping_existente:
        mapping_existente.mapping_json = mapping_json
    else:
        nuevo_mapping = models.PlantillaExcelMappingGlobal(
            mapping_json=mapping_json
        )
        db.add(nuevo_mapping)

    db.commit()
    return {"mensaje": "Mapping global creado/actualizado correctamente"}


@router.put("/plantilla-excel/mapping")
def actualizar_mapping_global(
    mapping_json: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    if not isinstance(mapping_json, dict):
        raise HTTPException(status_code=400, detail="El mapping debe ser un objeto JSON")

    mapping_global = (
        db.query(models.PlantillaExcelMappingGlobal)
        .order_by(models.PlantillaExcelMappingGlobal.id)
        .first()
    )

    if not mapping_global:
        raise HTTPException(status_code=404, detail="No existe un mapping global configurado")

    mapping_global.mapping_json = mapping_json
    db.commit()

    return {"mensaje": "Mapping global actualizado correctamente"}


@router.delete("/especialidades/{especialidad_id}/plantilla-excel")
def eliminar_plantilla_excel_especialidad(
    especialidad_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    storage_path = especialidad.plantilla_excel_storage_path
    if storage_path:
        try:
            borrar_plantilla_excel(storage_path)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))

    especialidad.plantilla_excel_storage_path = None
    db.commit()

    return {"mensaje": "Plantilla Excel eliminada correctamente"}


@router.get("/especialidades", response_model=List[schemas.EspecialidadResponse])
def listar_especialidades(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidades = db.query(models.Especialidad).all()
    return especialidades


@router.get("/especialidades/unidades/auditoria")
def auditar_consistencia_unidades(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidades = db.query(models.Especialidad).all()
    resultado = []

    for esp in especialidades:
        ok_uc, mensaje_uc = validate_uc_section_equal(esp.contenido_json or {})
        resultado.append(
            {
                "id": str(esp.id),
                "nombre": esp.nombre,
                "uc_consistente": ok_uc,
                "detalle": mensaje_uc if not ok_uc else "ok",
            }
        )

    return {
        "total": len(resultado),
        "inconsistentes": sum(1 for x in resultado if not x["uc_consistente"]),
        "resultados": resultado,
    }


@router.post("/especialidades/unidades/normalizar")
def normalizar_unidades_especialidades(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidades = db.query(models.Especialidad).all()
    actualizadas = 0

    for esp in especialidades:
        cleaned = canonicalize_uc_section(esp.contenido_json or {})
        if cleaned != (esp.contenido_json or {}):
            esp.contenido_json = cleaned
            actualizadas += 1

    db.commit()
    return {
        "mensaje": "Normalización de unidades completada",
        "especialidades_actualizadas": actualizadas,
        "especialidades_totales": len(especialidades),
    }


@router.get("/especialidades/{especialidad_id}")
def obtener_especialidad(
    especialidad_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    uc_global = ensure_global_uc(db)

    # Devolvemos JSON completo compuesto (UC + NIC global) para no romper preview/UI.
    contenido_compuesto = compose_molde_with_global_nic(
        especialidad.nombre,
        especialidad.contenido_json,
        uc_global,
    )

    return {
        "id": str(especialidad.id),
        "nombre": especialidad.nombre,
        "contenido_json": contenido_compuesto,
        "contenido_json_uc": especialidad.contenido_json,
        "plantilla_excel_storage_path": especialidad.plantilla_excel_storage_path,
    }


@router.put("/especialidades/{especialidad_id}")
def actualizar_especialidad_json(
    especialidad_id: str,
    datos_json: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    ok_nic, mensaje_nic = validate_nic_section(datos_json)
    if not ok_nic:
        raise HTTPException(status_code=400, detail=mensaje_nic)

    # Actualizamos la columna con NIC por especialidad.
    especialidad.contenido_json = canonicalize_nic_section(datos_json)
    db.commit()

    return {"mensaje": "JSON actualizado correctamente"}


@router.delete("/especialidades/{especialidad_id}")
def eliminar_especialidad(
    especialidad_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    especialidad = (
        db.query(models.Especialidad)
        .filter(models.Especialidad.id == especialidad_id)
        .first()
    )
    if not especialidad:
        raise HTTPException(status_code=404, detail="Especialidad no encontrada")

    # VALIDACIÓN: Verificar si hay rotaciones usando esta especialidad
    uso_activo = (
        db.query(models.Rotacion)
        .filter(models.Rotacion.especialidad_id == especialidad_id)
        .first()
    )
    if uso_activo:
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay alumnos matriculados en esta especialidad.",
        )

    db.delete(especialidad)
    db.commit()
    return {"mensaje": "Especialidad eliminada correctamente"}


@router.get("/usuarios/stats")
def obtener_estadisticas_usuarios(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    # Verificamos que sea el administrador
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    # Contamos los profesores
    total_profesores = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.rol == "profesor",
            models.Usuario.activo == True,
        )
        .count()
    )

    # Contamos los alumnos (estudiantes)
    total_alumnos = (
        db.query(models.Usuario).filter(models.Usuario.rol == "estudiante").count()
    )

    # Contamos el total de cuentas activas en todo el sistema
    total_activos = (
        db.query(models.Usuario).filter(models.Usuario.activo == True).count()
    )

    return {
        "alumnos": total_alumnos,
        "profesores": total_profesores,
        "total": total_activos,
    }


@router.get("/profesores")
def listar_profesores(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    profesores = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.rol == "profesor",
            models.Usuario.activo == True,
        )
        .all()
    )

    resultado = []
    for p in profesores:
        tipo_real = p.tipo_tutor
        if not tipo_real and p.asignaciones_rotaciones:
            tipo_real = p.asignaciones_rotaciones[0].tipo_tutor

        resultado.append(
            {
                "id": str(p.id),
                "email": p.email,
                "activo": p.activo,
                "tipo_tutor": tipo_real,
            }
        )

    return resultado


@router.put("/profesores/{profesor_id}/tipo")
def actualizar_tipo_profesor(
    profesor_id: str,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    tipo_tutor = str(payload.get("tipo_tutor", "")).strip().lower()
    if tipo_tutor not in ["hospital", "universidad"]:
        raise HTTPException(
            status_code=400,
            detail="tipo_tutor debe ser 'hospital' o 'universidad'",
        )

    profesor = (
        db.query(models.Usuario)
        .filter(models.Usuario.id == profesor_id, models.Usuario.rol == "profesor")
        .first()
    )
    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")

    profesor.tipo_tutor = tipo_tutor
    db.commit()
    return {"mensaje": "Tipo de tutor actualizado", "tipo_tutor": tipo_tutor}


def _resolver_tutor_por_email(db: Session, email: str, tipo_esperado: str):
    tutor = (
        db.query(models.Usuario)
        .filter(
            models.Usuario.email == email,
            models.Usuario.rol == "profesor",
            models.Usuario.activo == True,
        )
        .first()
    )
    if not tutor:
        raise HTTPException(status_code=404, detail=f"No existe el tutor: {email}")

    tipo_real = (tutor.tipo_tutor or "").strip().lower()
    if tipo_esperado == "hospital" and "hosp" not in tipo_real:
        raise HTTPException(status_code=400, detail=f"{email} no es tutor hospital")
    if tipo_esperado == "universidad" and "uni" not in tipo_real:
        raise HTTPException(status_code=400, detail=f"{email} no es tutor universidad")

    return tutor


@router.get("/centros", response_model=List[schemas.CentroPracticasResponse])
def listar_centros_practicas(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    centros = (
        db.query(models.CentroPracticas)
        .order_by(models.CentroPracticas.nombre)
        .all()
    )
    return [
        {
            "id": c.id,
            "nombre": c.nombre,
            "tutor_hospital_email": c.tutor_hospital.email if c.tutor_hospital else "",
            "tutor_universidad_email": c.tutor_universidad.email if c.tutor_universidad else "",
            "activo": c.activo,
        }
        for c in centros
    ]


@router.post("/centros", response_model=schemas.CentroPracticasResponse)
def crear_centro_practicas(
    datos: schemas.CentroPracticasCreate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    tutor_hospital = _resolver_tutor_por_email(db, datos.tutor_hospital_email, "hospital")
    tutor_universidad = _resolver_tutor_por_email(db, datos.tutor_universidad_email, "universidad")

    centro = models.CentroPracticas(
        nombre=datos.nombre.strip(),
        tutor_hospital_id=tutor_hospital.id,
        tutor_universidad_id=tutor_universidad.id,
        activo=True,
    )
    db.add(centro)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un centro con ese nombre",
        )
    db.refresh(centro)

    return {
        "id": centro.id,
        "nombre": centro.nombre,
        "tutor_hospital_email": tutor_hospital.email,
        "tutor_universidad_email": tutor_universidad.email,
        "activo": centro.activo,
    }


@router.put("/centros/{centro_id}", response_model=schemas.CentroPracticasResponse)
def actualizar_centro_practicas(
    centro_id: str,
    datos: schemas.CentroPracticasUpdate,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    centro = (
        db.query(models.CentroPracticas)
        .filter(models.CentroPracticas.id == centro_id)
        .first()
    )
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado")

    tutor_hospital = _resolver_tutor_por_email(db, datos.tutor_hospital_email, "hospital")
    tutor_universidad = _resolver_tutor_por_email(db, datos.tutor_universidad_email, "universidad")

    centro.nombre = datos.nombre.strip()
    centro.tutor_hospital_id = tutor_hospital.id
    centro.tutor_universidad_id = tutor_universidad.id
    centro.activo = datos.activo

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Ya existe un centro con ese nombre",
        )

    return {
        "id": centro.id,
        "nombre": centro.nombre,
        "tutor_hospital_email": tutor_hospital.email,
        "tutor_universidad_email": tutor_universidad.email,
        "activo": centro.activo,
    }


@router.delete("/centros/{centro_id}")
def eliminar_centro_practicas(
    centro_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    centro = (
        db.query(models.CentroPracticas)
        .filter(models.CentroPracticas.id == centro_id)
        .first()
    )
    if not centro:
        raise HTTPException(status_code=404, detail="Centro no encontrado")

    uso_activo = (
        db.query(models.Rotacion)
        .filter(models.Rotacion.centro_practicas == centro.nombre)
        .first()
    )
    if uso_activo:
        centro.activo = False
        db.commit()
        return {"mensaje": "Centro desactivado por tener histórico"}

    db.delete(centro)
    db.commit()
    return {"mensaje": "Centro eliminado correctamente"}


@router.delete("/profesores/{profesor_id}")
def eliminar_profesor(
    profesor_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    profesor = (
        db.query(models.Usuario)
        .filter(models.Usuario.id == profesor_id, models.Usuario.rol == "profesor")
        .first()
    )

    if not profesor:
        raise HTTPException(status_code=404, detail="Profesor no encontrado")

    asistencias_firmadas = (
        db.query(models.RegistroAsistencia)
        .filter(models.RegistroAsistencia.firmado_por == profesor.id)
        .count()
    )
    cuadernillos_firmados = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rellenado_por == profesor.id)
        .count()
    )

    # Si existe historial, no podemos (ni debemos) romper trazabilidad.
    if asistencias_firmadas > 0 or cuadernillos_firmados > 0:
        if not profesor.activo:
            return {
                "mensaje": "El profesor ya estaba desactivado y se conserva por historial.",
                "borrado_fisico": False,
            }

        profesor.activo = False
        db.commit()
        return {
            "mensaje": "Profesor desactivado: se conserva en base de datos por historial académico.",
            "borrado_fisico": False,
        }

    # Sin historial: podemos borrar físicamente limpiando relaciones operativas.
    db.query(models.AsignacionTutor).filter(
        models.AsignacionTutor.tutor_id == profesor.id
    ).delete(synchronize_session=False)
    db.query(models.IntentoLogin).filter(
        models.IntentoLogin.usuario_id == profesor.id
    ).delete(synchronize_session=False)

    db.delete(profesor)
    db.commit()
    return {
        "mensaje": "Profesor eliminado definitivamente de la base de datos.",
        "borrado_fisico": True,
    }


@router.get("/rotaciones/{rotacion_id}/descargar-excel")
def descargar_excel_evaluacion(
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

    if not rotacion.completada:
        raise HTTPException(status_code=400, detail="La evaluación no está cerrada")

    if not rotacion.especialidad:
        raise HTTPException(status_code=400, detail="Rotación sin especialidad")

    db_resp = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .first()
    )
    if not db_resp:
        raise HTTPException(status_code=400, detail="No hay respuestas para esta rotación")

    # Obtener mapping global
    mapping_global = (
        db.query(models.PlantillaExcelMappingGlobal)
        .order_by(models.PlantillaExcelMappingGlobal.id)
        .first()
    )
    if not mapping_global:
        raise HTTPException(status_code=400, detail="No hay mapeo Excel global configurado")

    try:
        excel_bytes, _ = generar_excel_evaluado(rotacion.especialidad, db_resp.respuestas_json, mapping_global.mapping_json)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    nombre_alumno = security.descifrar_dato(rotacion.alumno.nombre_cifrado)
    apellidos_alumno = security.descifrar_dato(rotacion.alumno.apellidos_cifrado)
    filename = f"evaluacion_{nombre_alumno}_{apellidos_alumno}_{rotacion.id}.xlsx".replace(" ", "_")

    return StreamingResponse(
        BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/alumnos/evaluaciones/exportar-excel")
def exportar_evaluaciones_alumnos_excel(
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    rotaciones = (
        db.query(models.Rotacion)
        .join(models.Alumno, models.Alumno.id == models.Rotacion.alumno_id)
        .filter(models.Rotacion.completada.is_(True))
        .order_by(
            models.Rotacion.periodo_academico.desc(),
            models.Rotacion.curso.desc(),
            models.Rotacion.numero_rotacion.asc(),
        )
        .all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Evaluaciones"

    ws.append(
        [
            "Nombre",
            "Apellidos",
            "Correo",
            "Curso",
            "Rotación",
            "Periodo académico",
            "Centro de prácticas",
            "Especialidad",
            "Tutor hospital",
            "Tutor universidad",
            "Nota final",
            "Estado",
        ]
    )

    for rot in rotaciones:
        alumno = rot.alumno
        if not alumno:
            continue

        nombre = security.descifrar_dato(alumno.nombre_cifrado)
        apellidos = security.descifrar_dato(alumno.apellidos_cifrado)
        correo = security.descifrar_dato(alumno.email_cifrado)

        asignaciones = (
            db.query(models.AsignacionTutor)
            .filter(models.AsignacionTutor.rotacion_id == rot.id)
            .all()
        )
        tutor_hospital = ""
        tutor_universidad = ""
        for asig in asignaciones:
            tipo = (asig.tipo_tutor or "").strip().lower()
            if tipo == "hospital":
                tutor_hospital = asig.tutor.email if asig.tutor else ""
            elif tipo == "universidad":
                tutor_universidad = asig.tutor.email if asig.tutor else ""

        ws.append(
            [
                nombre,
                apellidos,
                correo,
                rot.curso or alumno.curso,
                rot.numero_rotacion or alumno.numero_rotacion,
                normalizar_periodo_academico(rot.periodo_academico),
                rot.centro_practicas or "",
                rot.especialidad.nombre if rot.especialidad else "Sin especialidad",
                tutor_hospital,
                tutor_universidad,
                rot.final_grade_text or "",
                "Cerrada" if rot.completada else "Pendiente 2ª confirmación",
            ]
        )

    for col in ws.columns:
        max_len = 0
        col_letter = col[0].column_letter
        for cell in col:
            value = "" if cell.value is None else str(cell.value)
            if len(value) > max_len:
                max_len = len(value)
        ws.column_dimensions[col_letter].width = min(max(12, max_len + 2), 45)

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="evaluaciones_alumnos.xlsx"'},
    )


@router.delete("/usuarios/{usuario_id}")
def eliminar_usuario(
    usuario_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    usuario = (
        db.query(models.Usuario)
        .filter(models.Usuario.id == usuario_id)
        .first()
    )
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Si es un alumno con registro completado, hay que tener cuidado.
    # Pero para la lista de "pendientes" (donde registro_completado es False), es seguro.
    if usuario.registro_completado and usuario.rol == "estudiante":
         # Ver si tiene rotaciones
         alumno = db.query(models.Alumno).filter(models.Alumno.usuario_id == usuario.id).first()
         if alumno:
             tiene_rotaciones = db.query(models.Rotacion).filter(models.Rotacion.alumno_id == alumno.id).first()
             if tiene_rotaciones:
                 raise HTTPException(status_code=400, detail="No se puede eliminar un alumno con historial de rotaciones")

    # Limpiar tokens de recuperación e intentos de login
    db.query(models.TokenRecuperacion).filter(models.TokenRecuperacion.usuario_id == usuario.id).delete()
    db.query(models.IntentoLogin).filter(models.IntentoLogin.usuario_id == usuario.id).delete()
    
    db.delete(usuario)
    db.commit()
    return {"mensaje": "Usuario eliminado correctamente"}


@router.delete("/rotaciones/{rotacion_id}/tutores/campo")
def eliminar_tutor_campo_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")

    asignacion = (
        db.query(models.AsignacionTutor)
        .filter(
            models.AsignacionTutor.rotacion_id == rotacion_id,
            models.AsignacionTutor.tipo_tutor == "campo"
        )
        .first()
    )

    if not asignacion:
        raise HTTPException(status_code=404, detail="No hay tutor de campo asignado a esta rotación")

    db.delete(asignacion)
    db.commit()

    return {"mensaje": "Tutor de campo desasignado correctamente"}
