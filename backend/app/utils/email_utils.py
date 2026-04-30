import os
import smtplib
from email.message import EmailMessage
from typing import Iterable, List


def _smtp_settings():
    return {
        "host": os.getenv("SMTP_HOST", ""),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASSWORD", ""),
        "from_email": os.getenv("SMTP_FROM_EMAIL") or os.getenv("SMTP_USER", ""),
        "starttls": os.getenv("SMTP_STARTTLS", "true").lower() == "true",
    }


def _normalize_recipients(recipients: Iterable[str]) -> List[str]:
    return sorted({r.strip() for r in recipients if r and r.strip()})


def enviar_nota_final_email(
    recipients: Iterable[str],
    alumno_nombre: str,
    especialidad: str,
    nota_final: str,
    intento: int,
    evaluador_info: str = "Un tutor",
):
    settings = _smtp_settings()
    if not settings["host"] or not settings["from_email"]:
        raise ValueError("SMTP no configurado: faltan SMTP_HOST/SMTP_FROM_EMAIL")

    destinatarios = _normalize_recipients(recipients)
    if not destinatarios:
        raise ValueError("No hay destinatarios para el envío")

    if intento == 2:
        sujeto = f"[Practicum] Evaluación COMPLETADA - {alumno_nombre}"
        cuerpo = (
            f"Hola,\n\n"
            f"Se ha completado y firmado definitivamente la evaluación del alumno {alumno_nombre}.\n\n"
            f"Detalles de la evaluación:\n"
            f"- Especialidad: {especialidad}\n"
            f"- Nota final calculada: {nota_final or 'Pendiente'}\n"
            f"- Evaluado por: {evaluador_info}\n\n"
            f"Este es un mensaje automático de confirmación final.\n"
        )
    else:
        sujeto = f"[Practicum] Nota provisional (1ª revisión) - {alumno_nombre}"
        cuerpo = (
            f"Hola,\n\n"
            f"Se ha realizado la primera revisión de la evaluación del alumno {alumno_nombre}.\n\n"
            f"Detalles:\n"
            f"- Especialidad: {especialidad}\n"
            f"- Nota calculada: {nota_final or 'Pendiente'}\n"
            f"- Revisado por: {evaluador_info}\n\n"
            f"Recuerda que esta nota es provisional hasta la firma definitiva.\n"
        )

    msg = EmailMessage()
    msg["Subject"] = sujeto
    msg["From"] = settings["from_email"]
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(cuerpo)

    with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as server:
        if settings["starttls"]:
            server.starttls()
        if settings["user"]:
            server.login(settings["user"], settings["password"])
        server.send_message(msg)


def enviar_aviso_cierre_alumno_email(
    recipient: str,
    alumno_nombre: str,
    especialidad: str,
    tutor_email: str,
):
    settings = _smtp_settings()
    if not settings["host"] or not settings["from_email"]:
        raise ValueError("SMTP no configurado: faltan SMTP_HOST/SMTP_FROM_EMAIL")

    destinatarios = _normalize_recipients([recipient])
    if not destinatarios:
        raise ValueError("No hay destinatario para el aviso al alumno")

    sujeto = f"[Practicum] Evaluación completada - {alumno_nombre}"
    cuerpo = (
        f"Hola,\n\n"
        f"La evaluación de la rotación {especialidad} ha sido completada por el tutor {tutor_email}.\n"
        f"Tutor responsable: {tutor_email}\n"
        f"\n"
        f"Este mensaje es solo informativo y no incluye la nota.\n"
    )

    msg = EmailMessage()
    msg["Subject"] = sujeto
    msg["From"] = settings["from_email"]
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(cuerpo)

    with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as server:
        if settings["starttls"]:
            server.starttls()
        if settings["user"]:
            server.login(settings["user"], settings["password"])
        server.send_message(msg)


def enviar_invitacion_tutor_campo(
    recipient: str,
    alumno_nombre: str,
    especialidad: str,
    enlace: str,
):
    settings = _smtp_settings()
    if not settings["host"] or not settings["from_email"]:
        print("SMTP no configurado, no se puede enviar el email")
        return

    destinatarios = _normalize_recipients([recipient])
    if not destinatarios:
        return

    sujeto = f"[Practicum] Invitación como tutor de campo - {alumno_nombre}"
    cuerpo = (
        f"Hola,\n\n"
        f"El alumno {alumno_nombre} te ha añadido como su tutor de campo para la rotación de {especialidad}.\n\n"
        f"Para poder acceder a la plataforma y evaluar al alumno, por favor haz clic en el siguiente enlace para establecer tu contraseña:\n"
        f"{enlace}\n\n"
        f"Este enlace es válido por 30 minutos.\n"
    )

    msg = EmailMessage()
    msg["Subject"] = sujeto
    msg["From"] = settings["from_email"]
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(cuerpo)

    try:
        with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as server:
            if settings["starttls"]:
                server.starttls()
            if settings["user"]:
                server.login(settings["user"], settings["password"])
            server.send_message(msg)
    except Exception as e:
        print(f"Error enviando email: {e}")


def enviar_aviso_nuevo_tutor_campo(
    recipients: Iterable[str],
    alumno_nombre: str,
    especialidad: str,
    tutor_campo_email: str,
):
    settings = _smtp_settings()
    if not settings["host"] or not settings["from_email"]:
        print("SMTP no configurado, no se puede enviar el email")
        return

    destinatarios = _normalize_recipients(recipients)
    if not destinatarios:
        return

    sujeto = f"[Practicum] Nuevo tutor de campo añadido - {alumno_nombre}"
    cuerpo = (
        f"Hola,\n\n"
        f"El alumno {alumno_nombre} ha añadido a {tutor_campo_email} como su tutor de campo "
        f"para la rotación de {especialidad}.\n\n"
        f"Este mensaje es solo informativo.\n"
    )

    msg = EmailMessage()
    msg["Subject"] = sujeto
    msg["From"] = settings["from_email"]
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(cuerpo)

    try:
        with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as server:
            if settings["starttls"]:
                server.starttls()
            if settings["user"]:
                server.login(settings["user"], settings["password"])
            server.send_message(msg)
    except Exception as e:
        print(f"Error enviando email: {e}")


def enviar_aviso_asignacion_tutor_existente(
    recipient: str,
    alumno_nombre: str,
    especialidad: str,
):
    settings = _smtp_settings()
    if not settings["host"] or not settings["from_email"]:
        print("SMTP no configurado, no se puede enviar el email")
        return

    destinatarios = _normalize_recipients([recipient])
    if not destinatarios:
        return

    sujeto = f"[Practicum] Nueva rotación asignada - {alumno_nombre}"
    cuerpo = (
        f"Hola,\n\n"
        f"El alumno {alumno_nombre} te ha asignado como su tutor de campo para la rotación de {especialidad}.\n\n"
        f"Puedes acceder a la plataforma para ver sus detalles y evaluarlo cuando sea el momento oportuno.\n"
    )

    msg = EmailMessage()
    msg["Subject"] = sujeto
    msg["From"] = settings["from_email"]
    msg["To"] = ", ".join(destinatarios)
    msg.set_content(cuerpo)

    try:
        with smtplib.SMTP(settings["host"], settings["port"], timeout=20) as server:
            if settings["starttls"]:
                server.starttls()
            if settings["user"]:
                server.login(settings["user"], settings["password"])
            server.send_message(msg)
    except Exception as e:
        print(f"Error enviando email: {e}")
