from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_  
from ..database import get_db
from .. import models, security
from fastapi.responses import StreamingResponse
import json
import os
from typing import List
from ..schemas import RespuestaCreate
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)

router = APIRouter(prefix="/api/v1/cuadernillos", tags=["Cuadernillos"])


@router.get("/molde/{rotacion_id}")
def obtener_molde_cuadernillo(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol not in ["profesor", "estudiante"]:
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    alumno = rotacion.alumno
    if not rotacion.especialidad:
        raise HTTPException(
            status_code=400, detail="Esta rotación no tiene especialidad asignada"
        )

    molde_json = rotacion.especialidad.contenido_json

    if not molde_json:
        raise HTTPException(
            status_code=404,
            detail="El contenido del cuadernillo está vacío en la base de datos",
        )

    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)
    email_real = security.descifrar_dato(alumno.email_cifrado)

    db_resp = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .first()
    )

    borrador = {}
    if db_resp and (current_user.rol == "profesor" or rotacion.completada):
        borrador = db_resp.respuestas_json

    # Obtenemos las asignaciones y comprobamos si es tutor de universidad
    es_tutor_universidad = False
    asignaciones = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.rotacion_id == rotacion.id)
        .all()
    )
    
    tutores = []
    for asig in asignaciones:
        tutores.append(asig.tutor.email)
        if current_user.rol == "profesor" and asig.tutor_id == current_user.id:
            # Nos curamos en salud por si pusiste el campo en Usuario o AsignacionTutor
            tipo = getattr(asig, "tipo_tutor", None) or getattr(asig.tutor, "tipo_tutor", None)
            if tipo == "universidad":
                es_tutor_universidad = True

    return {
        "alumno": {
            "nombre_completo": f"{nombre_real} {apellidos_real}",
            "email": email_real,
            "curso": rotacion.curso,
            "grupo": alumno.grupo,
            "numero_rotacion": rotacion.numero_rotacion,
        },
        "especialidad": (
            rotacion.especialidad.nombre
            if rotacion.especialidad
            else "Sin especialidad"
        ),
        "molde": molde_json,
        "borrador": borrador,
        "rotacion_completada": rotacion.completada,
        "es_tutor_universidad": es_tutor_universidad,
        "tutores": tutores,
    }


@router.post("/guardar/{rotacion_id}")
def guardar_respuestas_cuadernillo(
    rotacion_id: str,
    respuestas: List[RespuestaCreate],
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion or rotacion.completada:
        raise HTTPException(
            status_code=400, detail="La rotación no existe o ya está cerrada"
        )

    nuevas_respuestas_dict = {}
    for r in respuestas:
        nuevas_respuestas_dict[r.elemento_id] = r.dict()

    db_resp = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .first()
    )

    if db_resp:
        respuestas_actuales = dict(db_resp.respuestas_json)
        respuestas_actuales.update(nuevas_respuestas_dict)
        db_resp.respuestas_json = respuestas_actuales
        db_resp.rellenado_por = current_user.id
    else:
        nueva_resp = models.CuadernilloRespuesta(
            rotacion_id=rotacion.id,
            respuestas_json=nuevas_respuestas_dict,
            rellenado_por=current_user.id,
        )
        db.add(nueva_resp)

    db.commit()
    return {"mensaje": "Borrador guardado correctamente en formato compacto"}


@router.post("/finalizar/{rotacion_id}")
def finalizar_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion or rotacion.completada:
        raise HTTPException(
            status_code=400, detail="Rotación no encontrada o ya finalizada"
        )

    if not rotacion.especialidad:
        raise HTTPException(
            status_code=400, detail="Esta rotación no tiene especialidad asignada"
        )

    try:
        molde = rotacion.especialidad.contenido_json
        if not molde:
            raise HTTPException(
                status_code=404,
                detail="No se pudo cargar el molde desde la base de datos",
            )

        total_esperado = len(molde["bloque_sinon"]["elementos"])
        for apartado in molde["apartados"]:
            total_esperado += len(apartado["elementos"])

        db_resp = (
            db.query(models.CuadernilloRespuesta)
            .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
            .first()
        )

        respuestas_dict = db_resp.respuestas_json if db_resp else {}

        total_real = 0
        for elemento_id, data in respuestas_dict.items():
            if (
                data.get("valor_sinon") is not None
                or data.get("valor_nivel") is not None
            ):
                total_real += 1

        if total_real < total_esperado:
            raise HTTPException(
                status_code=400,
                detail=f"Incompleto: faltan {total_esperado - total_real} campos de nota por rellenar.",
            )

        rotacion.completada = True
        db.commit()
        return {"mensaje": "Evaluación finalizada con éxito"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/descargar-pdf/{rotacion_id}")
def descargar_pdf_evaluacion_desde_cero(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    alumno = rotacion.alumno
    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)

    # --- CAMBIO: EXTRAEMOS LOS DOS TUTORES PARA EL PDF ---
    tutor_hospital = "Sin asignar"
    tutor_universidad = "Sin asignar"
    
    asignaciones = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.rotacion_id == rotacion.id)
        .all()
    )
    for asig in asignaciones:
        tipo = getattr(asig, "tipo_tutor", None) or getattr(asig.tutor, "tipo_tutor", None)
        if tipo == "universidad":
            tutor_universidad = asig.tutor.email
        elif tipo == "hospital":
            tutor_hospital = asig.tutor.email
        else:
            tutor_hospital = asig.tutor.email # Fallback por si acaso
    # -----------------------------------------------------

    nombre_especialidad = (
        rotacion.especialidad.nombre if rotacion.especialidad else "Sin especialidad"
    )
    if not rotacion.especialidad:
        raise HTTPException(
            status_code=400, detail="Esta rotación no tiene especialidad asignada"
        )

    molde = rotacion.especialidad.contenido_json

    if not molde:
        raise HTTPException(
            status_code=404,
            detail="El contenido del molde no está disponible en la base de datos",
        )

    db_resp = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .first()
    )
    resp_tutor = db_resp.respuestas_json if db_resp else {}

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40,
    )
    story = []

    styles = getSampleStyleSheet()
    title_style = styles["Heading1"]
    title_style.alignment = TA_CENTER
    h2_style = styles["Heading2"]
    h3_style = styles["Heading3"]
    normal_style = styles["Normal"]
    normal_style.alignment = TA_JUSTIFY
    normal_style.leading = 14

    table_text_style = ParagraphStyle(
        name="TableText", parent=styles["Normal"], fontSize=9, leading=11
    )
    table_header_style = ParagraphStyle(
        name="TableHeader",
        parent=styles["Normal"],
        fontSize=9,
        leading=11,
        fontName="Helvetica-Bold",
        alignment=TA_CENTER,
    )
    table_cell_center = ParagraphStyle(
        name="TableCellCenter",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        alignment=TA_CENTER,
    )

    story.append(
        Paragraph(
            "RÚBRICA PARA LA EVALUACIÓN POR COMPETENCIAS DE PRÁCTICAS CLÍNICAS",
            title_style,
        )
    )
    story.append(Spacer(1, 20))
    centro_real = rotacion.centro_practicas if rotacion.centro_practicas else "No especificado"

    # --- CAMBIO: AÑADIMOS AMBOS TUTORES A LA PORTADA ---
    datos_portada = [
        ["Nombre:", nombre_real],
        ["Apellidos:", apellidos_real],
        ["Centro de prácticas:", centro_real],
        [
            Paragraph("<b>Unidad de prácticas:</b>", normal_style),
            f"{nombre_especialidad}",
        ],
        ["Tutor/a hospital:", tutor_hospital],
        ["Tutor/a universidad:", tutor_universidad],
        [
            "Curso y Grupo:",
            f"{rotacion.curso}º Grado Enfermería - Grupo {alumno.grupo}",
        ],
    ]
    t_portada = Table(datos_portada, colWidths=[160, 340])
    t_portada.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.black),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    story.append(t_portada)

    story.append(PageBreak())

    story.append(Paragraph("1. INTRODUCCIÓN UFV", h2_style))
    story.append(
        Paragraph(
            "Desde el departamento de prácticas de enfermería de la Universidad Francisco de Vitoria, se considera que la práctica clínica es un componente esencial del proceso enseñanza - aprendizaje de enfermería, que brinda la oportunidad de integrar los diferentes elementos competenciales (conocimientos, habilidades y actitudes) necesarios para el desempeño de las funciones enfermeras, de manera segura y ética.",
            normal_style,
        )
    )
    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "Las prácticas clínicas se realizarán en diferentes unidades asistenciales, incorporando progresivamente la complejidad de las competencias específicas enfermeras así como los valores profesionales y competencias transversales de comunicación, relación interpersonal y juicio crítico, entre otras.",
            normal_style,
        )
    )
    story.append(Spacer(1, 20))

    story.append(Paragraph("2. DEFINICIÓN DE COMPETENCIA", h2_style))
    story.append(
        Paragraph(
            "<i>«Intersección entre conocimientos, habilidades, actitudes y valores, así como la movilización de estos componentes, para transferirlos al contexto o situación real creando la mejor actuación/solución para dar respuesta a las diferentes situaciones y problemas que se planteen en cada momento, con los recursos disponibles.»</i>",
            normal_style,
        )
    )
    story.append(Spacer(1, 20))

    story.append(Paragraph("3. NIVELES DE COMPETENCIA", h2_style))
    story.append(
        Paragraph(
            "Para valorar el nivel de cada resultado de aprendizaje se tienen en cuenta cuatro criterios: Frecuencia, Autonomía, Momento adecuado de realización y Utilización adecuada de recursos.",
            normal_style,
        )
    )
    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "<b>NIVEL 1 (BÁSICO):</b> La frecuencia será SIEMPRE. El estudiante será autónomo ENTRE EL 51% Y EL 99% de las ocasiones. Realizará lo que establece el resultado en el momento adecuado HASTA EL 50% de las ocasiones. Utilizará los recursos adecuados HASTA EL 50% de las ocasiones.",
            normal_style,
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        Paragraph(
            "<b>NIVEL 2 (INTERMEDIO):</b> La frecuencia será SIEMPRE. El estudiante será autónomo SIEMPRE. Realizará lo que establece el resultado en el momento adecuado ENTRE EL 51% Y EL 99% de las ocasiones. Utilizará los recursos adecuados ENTRE EL 51% Y EL 99% de las ocasiones.",
            normal_style,
        )
    )
    story.append(Spacer(1, 5))
    story.append(
        Paragraph(
            "<b>NIVEL 3 (AVANZADO):</b> La frecuencia será SIEMPRE. El estudiante será autónomo SIEMPRE. Realizará lo que establece el resultado en el momento adecuado SIEMPRE. Utilizará los recursos adecuados ENTRE EL 51% Y EL 99% de las ocasiones.",
            normal_style,
        )
    )
    story.append(Spacer(1, 20))

    story.append(Paragraph("4. EXPLICACIÓN DE LA RÚBRICA", h2_style))
    story.append(
        Paragraph(
            "El departamento de prácticas de la Universidad Francisco De Vitoria estipula que se evalúe a los alumnos en sus rotaciones de prácticas con la escala ECOEnf (Orden CIN 2134/2008). Se compone de siete unidades de competencias (UC) que se valoran en base a los criterios descritos atendiendo a los niveles de adquisición de la competencia.",
            normal_style,
        )
    )

    story.append(PageBreak())
    story.append(Paragraph("5. ACTIVIDADES ESPECÍFICAS (NIC)", h2_style))
    story.append(Paragraph("Clasificación de las Intervenciones Enfermeras", h3_style))
    story.append(Spacer(1, 10))

    datos_nic = [["Código / Intervención", "SÍ", "NO"]]
    for item in molde["bloque_sinon"]["elementos"]:
        r = resp_tutor.get(item["id"])
        marca_si = "X" if r and r.get("valor_sinon") is True else ""
        marca_no = "X" if r and r.get("valor_sinon") is False else ""
        texto_nic = Paragraph(item["texto"], table_text_style)
        datos_nic.append([texto_nic, marca_si, marca_no])

    t_nic = Table(datos_nic, colWidths=[400, 50, 50], repeatRows=1)
    t_nic.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ALIGN", (1, 0), (2, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(t_nic)

    def obtener_tabla_criterios():
        data = [
            [
                Paragraph("CRITERIOS", table_header_style),
                Paragraph("NIVEL 1 (BÁSICO)", table_header_style),
                Paragraph("NIVEL 2 (INTERMEDIO)", table_header_style),
                Paragraph("NIVEL 3 (AVANZADO)", table_header_style),
            ],
            [
                Paragraph("FRECUENCIA DE REALIZACIÓN", table_cell_center),
                Paragraph("SIEMPRE", table_cell_center),
                Paragraph("SIEMPRE", table_cell_center),
                Paragraph("SIEMPRE", table_cell_center),
            ],
            [
                Paragraph("AUTONOMÍA PERSONAL", table_cell_center),
                Paragraph(
                    "ENTRE EL 51% Y EL 99%<br/>de las ocasiones...", table_cell_center
                ),
                Paragraph("SIEMPRE", table_cell_center),
                Paragraph("SIEMPRE", table_cell_center),
            ],
            [
                Paragraph("MOMENTO ADECUADO DE REALIZACIÓN", table_cell_center),
                Paragraph("HASTA EL 50%<br/>de las ocasiones...", table_cell_center),
                Paragraph(
                    "ENTRE EL 51% Y EL 99%<br/>de las ocasiones...", table_cell_center
                ),
                Paragraph("SIEMPRE", table_cell_center),
            ],
            [
                Paragraph("UTILIZACIÓN ADECUADA DE RECURSOS", table_cell_center),
                Paragraph("HASTA EL 50%<br/>de las ocasiones...", table_cell_center),
                Paragraph(
                    "ENTRE EL 51% Y EL 99%<br/>de las ocasiones...", table_cell_center
                ),
                Paragraph(
                    "ENTRE EL 51% Y EL 99%<br/>de las ocasiones...", table_cell_center
                ),
            ],
        ]
        t = Table(data, colWidths=[120, 125, 125, 125])
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.Color(0.85, 0.85, 0.85)),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ]
            )
        )
        return t

    for apartado in molde["apartados"]:
        story.append(PageBreak())
        story.append(
            Paragraph(
                f"UNIDAD DE COMPETENCIA {apartado['numero']}: {apartado['titulo']}",
                h2_style,
            )
        )
        story.append(Spacer(1, 10))

        story.append(obtener_tabla_criterios())
        story.append(Spacer(1, 20))

        datos_uc = [["Resultado de Aprendizaje", "Nivel 1", "Nivel 2", "Nivel 3"]]
        for item in apartado["elementos"]:
            r = resp_tutor.get(item["id"])
            n1 = "X" if r and r.get("valor_nivel") == 1 else ""
            n2 = "X" if r and r.get("valor_nivel") == 2 else ""
            n3 = "X" if r and r.get("valor_nivel") == 3 else ""

            texto_uc = Paragraph(item["texto"], table_text_style)
            datos_uc.append([texto_uc, n1, n2, n3])

        comentario_obj = resp_tutor.get(f"comentario_apartado_{apartado['numero']}")
        if comentario_obj and comentario_obj.get("comentario"):
            datos_uc.append(
                [
                    Paragraph(
                        f"<i>Obs: {comentario_obj['comentario']}</i>", table_text_style
                    ),
                    "",
                    "",
                    "",
                ]
            )

        t_uc = Table(datos_uc, colWidths=[350, 50, 50, 50], repeatRows=1)
        estilos_uc = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ALIGN", (1, 0), (3, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]

        for idx, row in enumerate(datos_uc):
            if isinstance(row[0], Paragraph) and row[0].text.startswith("<i>Obs:"):
                estilos_uc.append(("SPAN", (0, idx), (3, idx)))
                estilos_uc.append(("BACKGROUND", (0, idx), (3, idx), colors.whitesmoke))

        t_uc.setStyle(TableStyle(estilos_uc))
        story.append(t_uc)

    story.append(Spacer(1, 40))
    story.append(Paragraph("COMENTARIOS Y FIRMAS", h2_style))
    story.append(
        Paragraph(
            "El presente documento certifica que el estudiante ha sido evaluado según los criterios de la escala ECOEnf de la Universidad Francisco de Vitoria para la presente rotación clínica.",
            normal_style,
        )
    )
    story.append(Spacer(1, 40))

    # --- CAMBIO: AÑADIMOS LAS DOS FIRMAS AL FINAL DEL DOCUMENTO ---
    story.append(Paragraph(f"<b>Tutor/a Clínico (Hospital):</b> {tutor_hospital}", normal_style))
    story.append(Spacer(1, 5))
    story.append(Paragraph(f"<b>Tutor/a Académico (Universidad):</b> {tutor_universidad}", normal_style))
    story.append(Spacer(1, 10))
    # --------------------------------------------------------------

    story.append(
        Paragraph(
            "<b>Fecha de Evaluación:</b> Firmado digitalmente en el sistema",
            normal_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    nombre_descarga = f"Evaluacion_{nombre_real.replace(' ', '_')}_{apellidos_real.replace(' ', '_')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_descarga}"},
    )