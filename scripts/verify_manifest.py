from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "PACKAGE_MANIFEST.json").read_text(encoding="utf-8"))
failures = []
entries = manifest.get("files", [])
if manifest.get("file_count") != len(entries):
    failures.append("manifest file_count does not match files array")
seen = set()
for entry in entries:
    rel = entry["path"]
    if rel in seen:
        failures.append(f"duplicate manifest path: {rel}")
        continue
    seen.add(rel)
    path = (ROOT / rel).resolve()
    if not path.is_relative_to(ROOT):
        failures.append(f"unsafe manifest path: {rel}")
        continue
    if not path.exists():
        failures.append(f"missing: {entry['path']}")
        continue
    data = path.read_bytes()
    if len(data) != entry["bytes"]:
        failures.append(f"size mismatch: {entry['path']}")
    actual = hashlib.sha256(data).hexdigest()
    if actual != entry["sha256"]:
        failures.append(f"hash mismatch: {entry['path']}")
if failures:
    print("MANIFEST VERIFY: FAIL")
    for item in failures:
        print("-", item)
    raise SystemExit(1)
print(f"MANIFEST VERIFY: PASS ({len(entries)} files)")
