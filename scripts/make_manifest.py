from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "PACKAGE_MANIFEST.json"
EXCLUDE_FILES = {"PACKAGE_MANIFEST.json", "QA_REPORT.local.md"}
EXCLUDE_DIRS = {
    ".git",
    ".mozare",
    ".mozare-runtime",
    ".pytest_cache",
    "__pycache__",
    "coverage",
    "dist",
    "node_modules",
    "playwright-report",
}


def included(path: Path) -> bool:
    rel = path.relative_to(ROOT)
    if rel.as_posix() in EXCLUDE_FILES:
        return False
    if any(part in EXCLUDE_DIRS for part in rel.parts):
        return False
    if path.suffix in {".log", ".pem", ".key"} or path.name.startswith(".env"):
        return False
    return True

entries = []
for path in sorted(p for p in ROOT.rglob("*") if p.is_file() and included(p)):
    rel = path.relative_to(ROOT).as_posix()
    data = path.read_bytes()
    entries.append({"path": rel, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})

payload = {
    "package": "Mozare_Workbench_Handoff",
    "version": "0.3.2",
    "manifest_format": 1,
    "file_count": len(entries),
    "files": entries,
}
MANIFEST.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {MANIFEST.name}: {len(entries)} files")
