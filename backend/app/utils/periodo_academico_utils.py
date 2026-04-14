import re


def normalizar_periodo_academico(valor: str) -> str:
    """Normaliza periodos academicos al formato YYYY/YY (ej: 2025/26)."""
    if valor is None:
        return ""

    texto = str(valor).strip()
    if not texto:
        return ""

    # Captura formatos como 2025/2026, 2025/26, 25-26, 2025 - 2026, etc.
    match = re.search(r"(\d{2,4})\D+(\d{2,4})", texto)
    if not match:
        return texto

    inicio_raw, fin_raw = match.groups()

    inicio = int(inicio_raw)
    if inicio < 100:
        inicio += 2000

    fin = int(fin_raw)
    if fin < 100:
        siglo = (inicio // 100) * 100
        fin = siglo + fin
        if fin < inicio:
            fin += 100

    return f"{inicio}/{fin % 100:02d}"
