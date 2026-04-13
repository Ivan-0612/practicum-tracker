import json
from pathlib import Path
from typing import Any, Dict, Tuple

_UC_FALLBACK_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "cuadernillos"
    / "hospitalización_i_curso2-rotacion1.json"
)

_NIC_GLOBAL_SOURCE = (
    Path(__file__).resolve().parents[2]
    / "cuadernillos"
    / "plantillas"
    / "actividades_nic_global.json"
)


def _extract_uc_section(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "apartados": data.get("apartados", []),
        "niveles": data.get("niveles", {}),
    }


def _extract_nic_section(data: Dict[str, Any]) -> Dict[str, Any]:
    bloque = data.get("bloque_sinon") if isinstance(data, dict) else None
    if not isinstance(bloque, dict):
        return {"bloque_sinon": {"titulo": "Actividades NIC", "elementos": []}}
    return {"bloque_sinon": bloque}


def _load_uc_fallback_section() -> Dict[str, Any]:
    if not _UC_FALLBACK_SOURCE.exists():
        return {"apartados": [], "niveles": {}}

    with _UC_FALLBACK_SOURCE.open("r", encoding="utf-8") as fh:
        canonical_raw = json.load(fh)

    return _extract_uc_section(canonical_raw)


def _load_nic_global_block() -> Dict[str, Any]:
    if _NIC_GLOBAL_SOURCE.exists():
        with _NIC_GLOBAL_SOURCE.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
        bloque = raw.get("bloque_sinon")
        if isinstance(bloque, dict):
            return bloque

    if _UC_FALLBACK_SOURCE.exists():
        with _UC_FALLBACK_SOURCE.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
        bloque = raw.get("bloque_sinon")
        if isinstance(bloque, dict):
            return bloque

    return {"titulo": "Actividades NIC", "elementos": []}


def compose_molde_with_global_nic(
    especialidad_nombre: str,
    nic_data: Dict[str, Any],
    uc_global_data: Dict[str, Any] = None,
) -> Dict[str, Any]:
    uc_source = uc_global_data if isinstance(uc_global_data, dict) and uc_global_data.get("apartados") else _load_uc_fallback_section()
    uc = _extract_uc_section(uc_source or {})
    nic = _extract_nic_section(nic_data or {})
    bloque_sinon = nic.get("bloque_sinon") or _load_nic_global_block()
    return {
        "version": "UC+NIC-GLOBAL",
        "titulo_rotacion": especialidad_nombre,
        "bloque_sinon": bloque_sinon,
        "apartados": uc.get("apartados", []),
        "niveles": uc.get("niveles", {}),
    }


def canonicalize_uc_section(data: Dict[str, Any]) -> Dict[str, Any]:
    # Mantiene compatibilidad con código existente: ahora "normalizar" significa
    # limpiar el payload a su sección UC (apartados + niveles).
    return _extract_uc_section(data or {})


def canonicalize_nic_section(data: Dict[str, Any]) -> Dict[str, Any]:
    return _extract_nic_section(data or {})


def validate_uc_section_equal(data: Dict[str, Any]) -> Tuple[bool, str]:
    # Mantiene compatibilidad con endpoints existentes: ahora valida estructura,
    # no igualdad contra un canon.
    current_uc = _extract_uc_section(data or {})

    apartados = current_uc.get("apartados")
    niveles = current_uc.get("niveles")
    if isinstance(apartados, list) and isinstance(niveles, dict) and len(apartados) > 0:
        return True, "ok"

    fallback_uc = _load_uc_fallback_section()
    if fallback_uc.get("apartados") and fallback_uc.get("niveles"):
        return False, "El JSON de especialidad debe contener la sección de unidades de competencia: 'apartados' (lista) y 'niveles' (objeto)."

    return False, "El JSON de especialidad debe contener la sección de unidades de competencia: 'apartados' (lista) y 'niveles' (objeto)."


def validate_nic_section(data: Dict[str, Any]) -> Tuple[bool, str]:
    nic = _extract_nic_section(data or {})
    bloque = nic.get("bloque_sinon")
    if not isinstance(bloque, dict):
        return False, "El JSON debe incluir 'bloque_sinon' como objeto."

    elementos = bloque.get("elementos")
    if not isinstance(elementos, list):
        return False, "El JSON debe incluir 'bloque_sinon.elementos' como lista."

    return True, "ok"
