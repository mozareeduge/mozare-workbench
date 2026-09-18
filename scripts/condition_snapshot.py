#!/usr/bin/env python3
"""Regenerate EXECUTION/CONDITION.md from live execution-loop state.

Read-only with respect to loop state: the only state access is through the
loop CLI (`status`, `next`), never by parsing or writing state.json.
Run after each completed task, then commit the snapshot so the repo itself
always shows the exact condition (owner directive: repo public, local and
GitHub synced, condition readable from the repo).

Usage: python scripts/condition_snapshot.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONDITION = ROOT / "EXECUTION" / "CONDITION.md"


def loop(*args: str) -> str:
    result = subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "execution_loop.py"), *args],
        capture_output=True,
        text=True,
        cwd=ROOT,
        timeout=60,
    )
    return (result.stdout or result.stderr).strip()


def head_sha() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"], capture_output=True, text=True, cwd=ROOT, timeout=30
    )
    return result.stdout.strip()


def main() -> int:
    status = loop("status")
    next_info = loop("next")
    sha = head_sha()
    now = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

    manifest_path = ROOT / "PACKAGE_MANIFEST.json"
    manifest_note = ""
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            tasks = manifest.get("tasks") or manifest.get("dag") or []
            if isinstance(tasks, list) and tasks:
                done = sum(1 for t in tasks if isinstance(t, dict) and t.get("status") in ("complete", "completed", "done"))
                manifest_note = f"PACKAGE_MANIFEST.json marks {done}/{len(tasks)} tasks complete."
        except (json.JSONDecodeError, OSError):
            manifest_note = ""

    lines = [
        "# Workbench condition (live snapshot)",
        "",
        f"Generated: {now} — by `python scripts/condition_snapshot.py`. Regenerate after every completed task and commit.",
        "",
        "## Execution loop state",
        "",
        "```",
        status,
        "```",
        "",
        "## Next ready task",
        "",
        "```",
        next_info or "(none — loop reports no ready task)",
        "```",
        "",
        f"HEAD at snapshot: `{sha}`",
        "",
    ]
    if manifest_note:
        lines += [manifest_note, ""]

    lines += [
        "## How to verify this condition yourself",
        "",
        "1. `python scripts/execution_loop.py status` — progress, active task, HEAD, tree state.",
        "2. `npm run typecheck && npm run lint && npx vitest run` — the full local gate.",
        "3. `python scripts/execution_loop.py packet` — the active task packet (scenarios, oracles, scope).",
        "",
        "Never hand-edit loop state; only the loop CLI mutates it. Structured handoffs for every",
        "completed task live in the loop's execution directory (see EXECUTION/ handoff docs).",
        "",
    ]

    CONDITION.write_text("\n".join(lines), encoding="utf-8")
    print(f"wrote {CONDITION}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
