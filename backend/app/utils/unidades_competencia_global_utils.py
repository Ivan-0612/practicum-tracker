import json
from pathlib import Path
from typing import Any, Dict

from sqlalchemy.orm import Session

from .. import models

_DEFAULT_UC_PATH = (
    Path(__file__).resolve().parents[2]
    / "cuadernillos"
    / "plantillas"
    / "unidades_competencia_global.json"
)


def _extract_uc_section(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "apartados": data.get("apartados", []),
        "niveles": data.get("niveles", {}),
    }


def _load_default_uc_file() -> Dict[str, Any]:
    if not _DEFAULT_UC_PATH.exists():
        return {"apartados": [], "niveles": {}}

    try:
        with _DEFAULT_UC_PATH.open("r", encoding="utf-8") as fh:
            raw = json.load(fh)
    except Exception:
        return {"apartados": [], "niveles": {}}

    return _extract_uc_section(raw if isinstance(raw, dict) else {})


def ensure_global_uc(db: Session) -> Dict[str, Any]:
    uc_row = (
        db.query(models.UnidadesCompetenciaGlobal)
        .order_by(models.UnidadesCompetenciaGlobal.id)
        .first()
    )

    if uc_row and isinstance(uc_row.uc_json, dict) and uc_row.uc_json.get("apartados"):
        return uc_row.uc_json

    default_uc = _load_default_uc_file()
    if not default_uc.get("apartados"):
        return default_uc

    if uc_row:
        uc_row.uc_json = default_uc
    else:
        uc_row = models.UnidadesCompetenciaGlobal(uc_json=default_uc)
        db.add(uc_row)

    db.commit()
    return default_uc


def set_global_uc(db: Session, uc_json: Dict[str, Any]) -> Dict[str, Any]:
    uc_row = (
        db.query(models.UnidadesCompetenciaGlobal)
        .order_by(models.UnidadesCompetenciaGlobal.id)
        .first()
    )

    if uc_row:
        uc_row.uc_json = uc_json
    else:
        uc_row = models.UnidadesCompetenciaGlobal(uc_json=uc_json)
        db.add(uc_row)

    db.commit()
    return uc_json
