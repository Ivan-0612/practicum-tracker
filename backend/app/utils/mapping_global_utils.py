import json
from pathlib import Path
from typing import Any, Dict

from sqlalchemy.orm import Session

from .. import models

_DEFAULT_MAPPING_PATH = (
    Path(__file__).resolve().parents[2]
    / "cuadernillos"
    / "mappings"
    / "hospitalizacion_i_mapping_admin_only.json"
)


def _load_default_mapping_file() -> Dict[str, Any]:
    if not _DEFAULT_MAPPING_PATH.exists():
        return {}

    try:
        with _DEFAULT_MAPPING_PATH.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except Exception:
        return {}

    return data if isinstance(data, dict) else {}


def ensure_global_mapping(db: Session) -> Dict[str, Any]:
    mapping_row = (
        db.query(models.PlantillaExcelMappingGlobal)
        .order_by(models.PlantillaExcelMappingGlobal.id)
        .first()
    )

    if mapping_row and isinstance(mapping_row.mapping_json, dict) and mapping_row.mapping_json:
        return mapping_row.mapping_json

    default_mapping = _load_default_mapping_file()
    if not default_mapping:
        return {}

    if mapping_row:
        mapping_row.mapping_json = default_mapping
    else:
        mapping_row = models.PlantillaExcelMappingGlobal(mapping_json=default_mapping)
        db.add(mapping_row)

    db.commit()
    return default_mapping
