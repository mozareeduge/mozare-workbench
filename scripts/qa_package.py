from __future__ import annotations
import argparse, hashlib, json, datetime as _dt, importlib.util, re, shutil, subprocess, sys
from pathlib import Path
import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
IGNORED_RUNTIME_DIRS = {".git",".mozare",".mozare-runtime",".pytest_cache","__pycache__","coverage","dist","node_modules","playwright-report"}
REQUIRED = [
  "README.md","START_HERE_PROMPT.md","MIDDLE_LAYER_INDEX.md","AGENTS.md","CLAUDE.md","SOURCES.md",
  "AUTHORITY/00_PRODUCT_HORIZON.md","AUTHORITY/01_OBJECT_STATE_AND_FLOW_MODEL.md","AUTHORITY/02_SCENARIO_CASE_ATLAS.md",
  "AUTHORITY/03_DESIGN_UIUX_BLUEPRINTS.md","AUTHORITY/04_COPY_DECK.md","AUTHORITY/05_DECISION_AND_SUPERSESSION_LEDGER.md",
  "QA/QA_STATE.yaml","QA/QA_ORACLE_REGISTER.md","QA/CLAUDE_QA_CONTRACT.md","QA/EVIDENCE_INDEX.md",
  "EXECUTION/CLAUDE_CODE_EXECUTION_INTAKE.md","EXECUTION/TASK_DAG.yaml","EXECUTION/TASK_CARDS.yaml","EXECUTION/LAUNCH_MANIFEST.yaml","EXECUTION/TRACEABILITY.csv","EXECUTION/LIGHT_MODEL_EXECUTION_PLAYBOOK.md","EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml","EXECUTION/REPOSITORY_BLUEPRINT.yaml","EXECUTION/HARNESS_BOOTSTRAP_PROMPT.md","EXECUTION/AGENT_ADAPTER_BASELINES.md",
  "TECH/ARCHITECTURE.md","TECH/INTEGRATIONS.md","TECH/SECURITY.md","TECH/STATE_AND_API_CONTRACTS.md",
  "UI/design-tokens.css","UI/component-contracts.md","UI/layout-contracts.md",
  "AUTHORITY/06_CONTEXT_AND_GENERATIVE_REPRESENTATION.md","CONTEXT/context-policy.yaml","CONTEXT/model-routing.yaml","CONTEXT/representation-policy.yaml",
  "CONTEXT/context-pack.schema.json","CONTEXT/evidence-capsule.schema.json","CONTEXT/context-snapshot.schema.json","CONTEXT/context-delta.schema.json","CONTEXT/representation-plan.schema.json","CONTEXT/token-metrics.schema.json",
  "GENUI/README.md","GENUI/REPRESENTATION_RUNTIME.md","GENUI/component-registry.yaml","GENUI/openui-library.reference.tsx",
  "scripts/context_compiler.py","scripts/audit_traceability.py","tests/context/test_context_compiler.py","tests/execution/test_execution_loop.py","CONTEXT/examples/compiled-packet.json",
  "EXECUTION/TASK_DETAILS_CONTEXT_GENUI.md","EXECUTION/CONTEXT_GENUI_TRACEABILITY.md",
  "CONTROL/01_PRODUCT_DESIGN_POSSIBILITY_SPACE_COMPILER_v1.1.md","CONTROL/02_LLM_QA_AND_CLAUDE_QA_COMPILER_v1.1.md","CONTROL/03_EXECUTION_INTAKE_AND_LAUNCH_COMPILER_v1.1.md",
  "config/project.schema.json","config/object.schema.json","config/relation.schema.json","config/mission.schema.json","config/handoff.schema.json","config/proposal.schema.json",
  "config/decision.schema.json","config/review.schema.json","config/oracle.schema.json","config/task.schema.json","config/task-card.schema.json",
  "seed/github-projects.seed.yaml","seed/mozare-wiki.adapter.yaml","seed/example-project/PROJECT.md","seed/example.handoff.json",
  "prototype/index.html","prototype/assets/prototype.css","prototype/assets/prototype.js",
  "scripts/test_prototype.py","scripts/qa_package.py","scripts/validate_execution_contract.py","scripts/execution_loop.py","scripts/make_manifest.py","scripts/verify_manifest.py","QA/LIGHT_MODEL_HANDOFF_AUDIT.md","QA/EXECUTION_READINESS_AUDIT_v0.3.2.md","QA/FINALIZATION_CHECKLIST.md",
  "EXECUTION/CODEX_HARNESS_PROFILE.yaml","EXECUTION/FRESH_CONTEXT_PROMPT.md","EXECUTION/SYSTEM_EXECUTION_PLAN.md"
]

SCHEMA_INSTANCES = {
  "project": ("config/project.schema.json", "seed/example-project/PROJECT.md"),
  "object": ("config/object.schema.json", "seed/example-project/objects/q_20260914_example01.md"),
  "relation": ("config/relation.schema.json", "seed/example-project/relations/rel_20260914_example01.yaml"),
  "handoff": ("config/handoff.schema.json", "seed/example.handoff.json"),
}

def sha256(path: Path) -> str: return hashlib.sha256(path.read_bytes()).hexdigest()

def ignored_runtime_path(path: Path) -> bool:
  return any(part in IGNORED_RUNTIME_DIRS for part in path.relative_to(ROOT).parts)

def parse_frontmatter(path: Path):
  text=path.read_text(encoding="utf-8")
  if not text.startswith("---\n"): raise ValueError(f"missing YAML frontmatter: {path.relative_to(ROOT)}")
  end=text.find("\n---\n",4)
  if end<0: raise ValueError(f"unterminated YAML frontmatter: {path.relative_to(ROOT)}")
  return yaml.safe_load(text[4:end]) or {}

def normalize(v):
  if isinstance(v,(_dt.datetime,_dt.date)): return v.isoformat()
  if isinstance(v,dict): return {k:normalize(x) for k,x in v.items()}
  if isinstance(v,list): return [normalize(x) for x in v]
  return v

def validate_instance(schema, instance):
  return [f"{list(e.path)}: {e.message}" for e in Draft202012Validator(schema).iter_errors(normalize(instance))]

def main(report_path: str | None = None):
  failures=[]; notes=[]
  for rel in REQUIRED:
    if not (ROOT/rel).exists(): failures.append(f"missing required file: {rel}")

  schemas={}
  for path in sorted((ROOT/"config").glob("*.schema.json")):
    try:
      data=json.loads(path.read_text(encoding="utf-8")); Draft202012Validator.check_schema(data); schemas[path.name]=data
    except Exception as e: failures.append(f"schema invalid {path.name}: {e}")

  for name,(schema_rel,inst_rel) in SCHEMA_INSTANCES.items():
    try:
      p=ROOT/inst_rel
      if p.suffix==".md": inst=parse_frontmatter(p)
      elif p.suffix in {".yaml",".yml"}: inst=yaml.safe_load(p.read_text(encoding="utf-8"))
      else: inst=json.loads(p.read_text(encoding="utf-8"))
      for err in validate_instance(schemas[Path(schema_rel).name],inst): failures.append(f"{name} fixture: {err}")
    except Exception as e: failures.append(f"{name} fixture parse/validate: {e}")

  for p in [ROOT/"QA/QA_STATE.yaml",ROOT/"EXECUTION/TASK_DAG.yaml",ROOT/"EXECUTION/LAUNCH_MANIFEST.yaml"]:
    try: yaml.safe_load(p.read_text(encoding="utf-8"))
    except Exception as e: failures.append(f"YAML invalid {p.relative_to(ROOT)}: {e}")

  # Traceability: every task/oracle must have a CSV row and dependency IDs must exist.
  try:
    dag=yaml.safe_load((ROOT/"EXECUTION/TASK_DAG.yaml").read_text(encoding="utf-8")); tasks=dag["tasks"]; ids={t["id"] for t in tasks}
    for t in tasks:
      for dep in t.get("deps",[]):
        if dep not in ids: failures.append(f"unknown task dependency {dep} in {t['id']}")
    trace=(ROOT/"EXECUTION/TRACEABILITY.csv").read_text(encoding="utf-8-sig")
    for t in tasks:
      if t["id"] not in trace: failures.append(f"task missing from TRACEABILITY.csv: {t['id']}")
      for o in t.get("oracles",[]):
        if o not in trace: failures.append(f"oracle missing from traceability: {o}")
  except Exception as e: failures.append(f"task DAG/traceability check: {e}")

  # Authority namespaces have matching downstream references.
  scenario_text=(ROOT/"AUTHORITY/02_SCENARIO_CASE_ATLAS.md").read_text(encoding="utf-8")
  oracle_text=(ROOT/"QA/QA_ORACLE_REGISTER.md").read_text(encoding="utf-8")
  for token in ["SCN-REV-02","SCN-MIS-01","SCN-LOC-01","SCN-CTX-01","SCN-GUI-05","SCN-MET-02"]:
    if token not in scenario_text: failures.append(f"critical scenario missing: {token}")
  for token in ["ORACLE-001","ORACLE-028","ORACLE-040","ORACLE-041","ORACLE-042","ORACLE-043","ORACLE-044"]:
    if token not in oracle_text: failures.append(f"oracle range incomplete: {token}")


  # v0.3 context schemas/policies and reference compiler tests.
  for path in sorted((ROOT/"CONTEXT").glob("*.schema.json")):
    try:
      data=json.loads(path.read_text(encoding="utf-8")); Draft202012Validator.check_schema(data); schemas["CONTEXT/"+path.name]=data
    except Exception as e: failures.append(f"context schema invalid {path.name}: {e}")
  for pth in [ROOT/"CONTEXT/context-policy.yaml",ROOT/"CONTEXT/model-routing.yaml",ROOT/"CONTEXT/representation-policy.yaml",ROOT/"GENUI/component-registry.yaml"]:
    try: yaml.safe_load(pth.read_text(encoding="utf-8"))
    except Exception as e: failures.append(f"policy YAML invalid {pth.relative_to(ROOT)}: {e}")
  try:
    proc=subprocess.run([sys.executable,"-m","pytest","-q",str(ROOT/"tests/context"),str(ROOT/"tests/execution")],capture_output=True,text=True)
    if proc.returncode: failures.append("context/execution loop tests failed: "+(proc.stdout+proc.stderr).strip())
    else: notes.append("context compiler and execution loop tests passed")
  except Exception as e: failures.append(f"context compiler test execution: {e}")

  try:
    ctx_schema=json.loads((ROOT/"CONTEXT/context-pack.schema.json").read_text(encoding="utf-8"))
    ctx_inst=json.loads((ROOT/"CONTEXT/examples/compiled-packet.json").read_text(encoding="utf-8"))
    errs=validate_instance(ctx_schema,ctx_inst)
    if errs: failures += [f"compiled context fixture: {e}" for e in errs]
    else: notes.append("compiled context fixture validates against ContextPack schema")
  except Exception as e: failures.append(f"compiled context fixture validation: {e}")
  try:
    proc=subprocess.run([sys.executable,str(ROOT/"scripts/audit_traceability.py")],capture_output=True,text=True)
    if proc.returncode: failures.append("traceability audit failed: "+(proc.stdout+proc.stderr).strip())
    else: notes.append(proc.stdout.strip())
  except Exception as e: failures.append(f"traceability audit execution: {e}")
  try:
    proc=subprocess.run([sys.executable,str(ROOT/"scripts/validate_execution_contract.py")],capture_output=True,text=True)
    if proc.returncode: failures.append("execution contract validation failed: "+(proc.stdout+proc.stderr).strip())
    else: notes.append(proc.stdout.strip())
  except Exception as e: failures.append(f"execution contract validation execution: {e}")

  try:
    ref=(ROOT/"GENUI/openui-library.reference.tsx").read_text(encoding="utf-8")
    for token in ["defineComponent","createLibrary","mozareOrientLibrary","mozareCompareLibrary","mozareSystemLibrary","mozareDecideLibrary","mozareReviewLibrary"]:
      if token not in ref: failures.append(f"OpenUI reference missing: {token}")
    notes.append("OpenUI reference library structural symbols checked")
  except Exception as e: failures.append(f"OpenUI reference structural check: {e}")

  source=ROOT/".agents/skills"; target=ROOT/".claude/skills"
  skills=sorted(p.name for p in source.iterdir() if p.is_dir()) if source.exists() else []
  if len(skills)<10: failures.append(f"expected >=10 canonical skills; found {len(skills)}")
  for name in skills:
    a=source/name/"SKILL.md"; b=target/name/"SKILL.md"
    if not a.exists() or not b.exists(): failures.append(f"skill mirror missing: {name}")
    elif sha256(a)!=sha256(b): failures.append(f"skill mirror hash mismatch: {name}")

  node=shutil.which("node")
  if node:
    proc=subprocess.run([node,"--check",str(ROOT/"prototype/assets/prototype.js")],capture_output=True,text=True)
    if proc.returncode: failures.append("prototype JS syntax: "+proc.stderr.strip())
    else: notes.append("prototype JavaScript syntax checked with node --check")
  else: notes.append("node unavailable; JS syntax check skipped")

  if importlib.util.find_spec("playwright") and shutil.which("chromium"):
    proc=subprocess.run([sys.executable,str(ROOT/"scripts/test_prototype.py")],capture_output=True,text=True)
    if proc.returncode: failures.append("prototype E2E failed: "+(proc.stderr.strip() or proc.stdout.strip()))
    else: notes.append("prototype E2E passed: desktop + mission + field drawer + review + mobile + 320px overflow")
  else: notes.append("Playwright/Chromium unavailable; prototype E2E skipped")

  start=(ROOT/"START_HERE_PROMPT.md").read_text(encoding="utf-8")
  for rel in re.findall(r"`((?:AUTHORITY|QA|TECH|EXECUTION|UI|prototype)/[^`]+)`",start):
    if not (ROOT/rel).exists(): failures.append(f"START_HERE references missing file: {rel}")

  # No historical/current ambiguity in primary index.
  middle=(ROOT/"MIDDLE_LAYER_INDEX.md").read_text(encoding="utf-8")
  if "PRODUCT_DESIGN_AUTHORITY_CLOSED" not in middle or "READY_FOR_CODE_EXECUTION" not in middle:
    failures.append("middle-layer index lacks closure states")

  for path in ROOT.rglob("*"):
    if not path.is_file() or path.name=="QA_REPORT.md" or ignored_runtime_path(path): continue
    if path.suffix.lower() not in {".md",".json",".yaml",".yml",".ps1",".py",".html",".js",".css",".csv"}: continue
    text=path.read_text(encoding="utf-8",errors="replace")
    if path.name!="qa_package.py" and "/mnt/data/" in text: failures.append(f"container path leaked: {path.relative_to(ROOT)}")
    if re.search(r"(?i)(api[_-]?key|token|secret)\s*[=:]\s*['\"]?[A-Za-z0-9_\-]{20,}",text): failures.append(f"possible credential literal: {path.relative_to(ROOT)}")

  notes += [f"files checked: {sum(1 for p in ROOT.rglob('*') if p.is_file() and not ignored_runtime_path(p))}", f"schemas meta-validated: {len(schemas)}", f"tasks checked: {len(yaml.safe_load((ROOT/'EXECUTION/TASK_DAG.yaml').read_text())['tasks'])}", f"canonical skills: {len(skills)}"]
  lines=["# Package QA Report","","## Result",""]
  if failures: lines += ["**FAIL**","","## Failures",""]+[f"- {x}" for x in failures]
  else: lines += ["**PASS**","","All package-integrity and bounded-prototype checks passed."]
  lines += ["","## Checks / Notes",""]+[f"- {x}" for x in notes]
  lines += ["","## Scope","","This validates the v0.3.2 handoff package, execution contract, deterministic context reference, and bounded interaction prototype. It does **not** claim the future production Workbench passes runtime product/security/agent integration oracles; those remain `UNTESTED` in `QA/QA_STATE.yaml` until implemented against an exact candidate.",""]
  if report_path:
    destination=(ROOT/report_path).resolve()
    if not destination.is_relative_to(ROOT):
      raise ValueError("report path must stay inside the package root")
    destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text("\n".join(lines),encoding="utf-8")
    notes.append(f"local report written: {destination.relative_to(ROOT).as_posix()}")
  print("PACKAGE QA:","FAIL" if failures else "PASS")
  for x in failures or notes: print("-",x)
  return 1 if failures else 0

if __name__=="__main__":
  parser=argparse.ArgumentParser(description="Validate the handoff package without mutating signed evidence by default.")
  parser.add_argument("--write-report",metavar="PATH",help="write a local report inside the package root")
  args=parser.parse_args()
  raise SystemExit(main(args.write_report))
