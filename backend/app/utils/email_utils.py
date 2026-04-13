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
):
    settings = _smtp_settings()
    if not settings["host"] or not settings["from_email"]:
        raise ValueError("SMTP no configurado: faltan SMTP_HOST/SMTP_FROM_EMAIL")

    destinatarios = _normalize_recipients(recipients)
    if not destinatarios:
        raise ValueError("No hay destinatarios para el envío")

    sujeto = (
        f"[Practicum] Nota final - {alumno_nombre} (confirmación final)"
        if intento == 2
        else f"[Practicum] Nota final - {alumno_nombre} (1ª revisión)"
    )

    cuerpo = (
        f"Alumno: {alumno_nombre}\n"
        f"Especialidad: {especialidad}\n"
        f"Nota final: {nota_final or 'Sin valor'}\n"
        f"Intento de cierre: {intento}/2\n"
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

    sujeto = f"[Practicum] Evaluación cerrada - {alumno_nombre}"
    cuerpo = (
        f"Hola,\n\n"
        f"El tutor {tutor_email} ha terminado su evaluación de la rotación {especialidad}.\n"
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
