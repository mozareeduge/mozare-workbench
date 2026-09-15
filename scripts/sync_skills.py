from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / ".agents" / "skills"
TARGET = ROOT / ".claude" / "skills"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    if not SOURCE.exists():
        raise SystemExit("Missing canonical .agents/skills directory")
    TARGET.mkdir(parents=True, exist_ok=True)
    copied = 0
    for skill_dir in sorted(p for p in SOURCE.iterdir() if p.is_dir()):
        src = skill_dir / "SKILL.md"
        if not src.exists():
            raise SystemExit(f"Missing SKILL.md: {skill_dir}")
        dst_dir = TARGET / skill_dir.name
        dst_dir.mkdir(parents=True, exist_ok=True)
        dst = dst_dir / "SKILL.md"
        shutil.copy2(src, dst)
        if digest(src) != digest(dst):
            raise SystemExit(f"Hash mismatch after copy: {skill_dir.name}")
        copied += 1
    print(f"Synced {copied} skills from .agents/skills to .claude/skills")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
