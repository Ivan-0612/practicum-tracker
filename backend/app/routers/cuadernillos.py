from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
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
    nombre_archivo = f"curso{rotacion.curso}-rotacion{rotacion.numero_rotacion}.json"

    # Lógica de rutas para encontrar el JSON
    base_path = os.getcwd()
    ruta_archivo = os.path.join(base_path, "cuadernillos", nombre_archivo)
    if not os.path.exists(ruta_archivo):
        ruta_archivo = os.path.join(base_path, "app", "cuadernillos", nombre_archivo)

    try:
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            molde_json = json.load(f)
    except Exception:
        raise HTTPException(
            status_code=404, detail=f"No se encontró el archivo {nombre_archivo}"
        )

    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)

    respuestas_db = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .all()
    )

    borrador = {}
    if current_user.rol == "profesor" or (
        current_user.rol == "estudiante" and rotacion.completada
    ):
        for resp in respuestas_db:
            borrador[resp.elemento_id] = {
                "bloque": resp.bloque,
                "elemento_id": resp.elemento_id,
                "valor_sinon": resp.valor_sinon,
                "valor_nivel": resp.valor_nivel,
                "comentario": resp.comentario,
            }
    else:
        # Si es estudiante y no está completada, el borrador se envía vacío
        borrador = {}

    asignaciones = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.rotacion_id == rotacion.id)
        .all()
    )
    tutores = [asig.tutor.email for asig in asignaciones]

    return {
        "alumno": {
            "nombre_completo": f"{nombre_real} {apellidos_real}",
            "curso": rotacion.curso,
            "grupo": alumno.grupo,
        },
        "molde": molde_json,
        "borrador": borrador,
        "rotacion_completada": rotacion.completada,
        "tutores": tutores,
    }


@router.post("/guardar/{rotacion_id}")
def guardar_respuestas_cuadernillo(
    rotacion_id: str,
    respuestas: List[RespuestaCreate],
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    """
    ESTE ES EL ENDPOINT PARA EL BORRADOR.
    No valida si está todo completo, solo guarda lo que envíes.
    """
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion or rotacion.completada:
        raise HTTPException(
            status_code=400, detail="La rotación no existe o ya está cerrada"
        )

    for resp in respuestas:
        # Buscar si ya existe la respuesta para actualizarla, si no, crearla
        db_resp = (
            db.query(models.CuadernilloRespuesta)
            .filter(
                models.CuadernilloRespuesta.rotacion_id == rotacion.id,
                models.CuadernilloRespuesta.elemento_id == resp.elemento_id,
            )
            .first()
        )

        if db_resp:
            db_resp.valor_sinon = resp.valor_sinon
            db_resp.valor_nivel = resp.valor_nivel
            db_resp.comentario = resp.comentario
        else:
            nueva_resp = models.CuadernilloRespuesta(
                rotacion_id=rotacion.id,
                version_cuadernillo="2025-v1",
                bloque=resp.bloque,
                elemento_id=resp.elemento_id,
                valor_sinon=resp.valor_sinon,
                valor_nivel=resp.valor_nivel,
                comentario=resp.comentario,
                rellenado_por=current_user.id,
            )
            db.add(nueva_resp)

    db.commit()
    return {"mensaje": "Borrador guardado correctamente"}


@router.post("/finalizar/{rotacion_id}")
def finalizar_rotacion(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    """
    ESTE ES EL ENDPOINT DE CIERRE.
    Aquí sí validamos que todo esté relleno antes de poner completada = True.
    """
    if current_user.rol != "profesor":
        raise HTTPException(status_code=403, detail="No tienes permiso")

    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion or rotacion.completada:
        raise HTTPException(
            status_code=400, detail="Rotación no encontrada o ya finalizada"
        )

    # --- Lógica de validación de integridad ---
    alumno = rotacion.alumno
    nombre_archivo = f"curso{alumno.curso}-rotacion{alumno.numero_rotacion}.json"
    base_path = os.getcwd()
    ruta_archivo = os.path.join(base_path, "cuadernillos", nombre_archivo)
    if not os.path.exists(ruta_archivo):
        ruta_archivo = os.path.join(base_path, "app", "cuadernillos", nombre_archivo)

    try:
        with open(ruta_archivo, "r", encoding="utf-8") as f:
            molde = json.load(f)

        total_esperado = len(molde["bloque_sinon"]["elementos"])
        for apartado in molde["apartados"]:
            total_esperado += len(apartado["elementos"])

        total_real = (
            db.query(models.CuadernilloRespuesta)
            .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
            .count()
        )

        if total_real < total_esperado:
            raise HTTPException(
                status_code=400,
                detail=f"Incompleto: faltan {total_esperado - total_real} campos.",
            )

        # Si está todo, cerramos
        rotacion.completada = True
        db.commit()
        return {"mensaje": "Evaluación finalizada con éxito"}

    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="No se pudo validar el molde")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/descargar-pdf/{rotacion_id}")
def descargar_pdf_evaluacion_desde_cero(
    rotacion_id: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(security.get_current_user),
):
    # 1. Obtener datos
    rotacion = (
        db.query(models.Rotacion).filter(models.Rotacion.id == rotacion_id).first()
    )
    if not rotacion:
        raise HTTPException(status_code=404, detail="Rotación no encontrada")

    alumno = rotacion.alumno
    nombre_real = security.descifrar_dato(alumno.nombre_cifrado)
    apellidos_real = security.descifrar_dato(alumno.apellidos_cifrado)

    tutor_nombre = "Tutor no asignado"
    asignacion = (
        db.query(models.AsignacionTutor)
        .filter(models.AsignacionTutor.rotacion_id == rotacion.id)
        .first()
    )
    if asignacion:
        tutor_nombre = asignacion.tutor.email

    nombre_json = f"curso{rotacion.curso}-rotacion{rotacion.numero_rotacion}.json"
    base_path = os.getcwd()
    ruta_json = os.path.join(base_path, "cuadernillos", nombre_json)
    if not os.path.exists(ruta_json):
        ruta_json = os.path.join(base_path, "app", "cuadernillos", nombre_json)

    if not os.path.exists(ruta_json):
        raise HTTPException(
            status_code=500, detail=f"No se encuentra el molde {nombre_json}"
        )

    with open(ruta_json, "r", encoding="utf-8") as f:
        molde = json.load(f)

    respuestas_db = (
        db.query(models.CuadernilloRespuesta)
        .filter(models.CuadernilloRespuesta.rotacion_id == rotacion.id)
        .all()
    )
    resp_tutor = {r.elemento_id: r for r in respuestas_db}

    # 2. CONFIGURACIÓN DEL PDF
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

    # --- PÁGINA 1: PORTADA ---
    story.append(
        Paragraph(
            "RÚBRICA PARA LA EVALUACIÓN POR COMPETENCIAS DE PRÁCTICAS CLÍNICAS",
            title_style,
        )
    )
    story.append(Spacer(1, 20))

    datos_portada = [
        ["Nombre:", nombre_real],
        ["Apellidos:", apellidos_real],
        ["Centro de prácticas:", ""],
        ["Unidad de prácticas:", ""],
        ["Tutor/a de prácticas:", tutor_nombre],
        [
            "Curso y Grupo:",
            f"{rotacion.curso}º Grado Enfermería - Grupo {alumno.grupo}",
        ],
    ]
    t_portada = Table(datos_portada, colWidths=[130, 370])
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

    # --- PÁGINA 2: TEXTOS INTRODUCTORIOS (UFV) ---
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

    # --- PÁGINA 3: TABLA NIC ---
    story.append(PageBreak())
    story.append(Paragraph("5. ACTIVIDADES ESPECÍFICAS (NIC)", h2_style))
    story.append(Paragraph("Clasificación de las Intervenciones Enfermeras", h3_style))
    story.append(Spacer(1, 10))

    datos_nic = [["Código / Intervención", "SÍ", "NO"]]
    for item in molde["bloque_sinon"]["elementos"]:
        r = resp_tutor.get(item["id"])
        marca_si = "X" if r and r.valor_sinon is True else ""
        marca_no = "X" if r and r.valor_sinon is False else ""
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

    # --- UNIDADES DE COMPETENCIA 1 A 7 ---

    # Función para inyectar la tabla de explicación de niveles antes de las notas
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

        # Insertar tabla explicativa de niveles
        story.append(obtener_tabla_criterios())
        story.append(Spacer(1, 20))

        # Insertar tabla de evaluación
        datos_uc = [["Resultado de Aprendizaje", "Nivel 1", "Nivel 2", "Nivel 3"]]
        for item in apartado["elementos"]:
            r = resp_tutor.get(item["id"])
            n1 = "X" if r and r.valor_nivel == 1 else ""
            n2 = "X" if r and r.valor_nivel == 2 else ""
            n3 = "X" if r and r.valor_nivel == 3 else ""

            texto_uc = Paragraph(item["texto"], table_text_style)
            datos_uc.append([texto_uc, n1, n2, n3])

            if r and r.comentario:
                datos_uc.append(
                    [
                        Paragraph(f"<i>Obs: {r.comentario}</i>", table_text_style),
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

    # --- PÁGINA FINAL: FIRMAS ---
    story.append(Spacer(1, 40))
    story.append(Paragraph("COMENTARIOS Y FIRMAS", h2_style))
    story.append(
        Paragraph(
            "El presente documento certifica que el estudiante ha sido evaluado según los criterios de la escala ECOEnf de la Universidad Francisco de Vitoria para la presente rotación clínica.",
            normal_style,
        )
    )
    story.append(Spacer(1, 40))

    story.append(Paragraph(f"<b>Tutor/a Clínico:</b> {tutor_nombre}", normal_style))
    story.append(
        Paragraph(
            "<b>Fecha de Evaluación:</b> Firmado digitalmente en el sistema",
            normal_style,
        )
    )

    # 3. CONSTRUIR EL PDF Y ENVIAR
    doc.build(story)
    buffer.seek(0)
    nombre_descarga = f"Evaluacion_{nombre_real.replace(' ', '_')}_{apellidos_real.replace(' ', '_')}.pdf"

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nombre_descarga}"},
    )
