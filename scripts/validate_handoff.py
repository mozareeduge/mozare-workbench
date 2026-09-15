from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    jsonschema = None

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = ROOT / "config" / "handoff.schema.json"


def validate(instance_path: Path) -> list[str]:
    schema = json.loads(SCHEMA.read_text(encoding="utf-8"))
    instance = json.loads(instance_path.read_text(encoding="utf-8"))
    if jsonschema is None:
        required = schema.get("required", [])
        return [f"missing required key: {k}" for k in required if k not in instance]
    validator = jsonschema.Draft202012Validator(schema)
    return [e.message for e in sorted(validator.iter_errors(instance), key=lambda e: list(e.path))]


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/validate_handoff.py <handoff.json>")
        return 2
    path = Path(sys.argv[1]).resolve()
    errors = validate(path)
    if errors:
        print("HANDOFF INVALID")
        for error in errors:
            print(f"- {error}")
        return 1
    print("HANDOFF VALID")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
