from pathlib import Path
import re, yaml
ROOT=Path(__file__).resolve().parents[1]
scn_text=(ROOT/'AUTHORITY/02_SCENARIO_CASE_ATLAS.md').read_text(encoding='utf-8')
or_text=(ROOT/'QA/QA_ORACLE_REGISTER.md').read_text(encoding='utf-8')
scns=set(re.findall(r'\bSCN-[A-Z0-9-]+',scn_text))
ors=set(re.findall(r'\bORACLE-\d{3}\b',or_text))
dag=yaml.safe_load((ROOT/'EXECUTION/TASK_DAG.yaml').read_text(encoding='utf-8'))
errors=[]; rs=set(); ro=set()
for t in dag['tasks']:
    for s in t.get('scenarios',[]):
        rs.add(s)
        if s not in scns: errors.append(f"{t['id']} references missing scenario {s}")
    for o in t.get('oracles',[]):
        ro.add(o)
        if o not in ors: errors.append(f"{t['id']} references missing oracle {o}")
for s in sorted(scns):
    if s not in rs: errors.append(f"scenario has no execution task: {s}")
for o in sorted(ors):
    if o not in ro: errors.append(f"oracle has no execution task: {o}")
# Dependency graph must be acyclic.
by_id={t["id"]:t for t in dag["tasks"]}
visiting=set(); visited=set()
def visit(n):
    if n in visiting:
        errors.append(f"task dependency cycle at {n}"); return
    if n in visited: return
    visiting.add(n)
    for d in by_id[n].get("deps",[]):
        if d in by_id: visit(d)
    visiting.remove(n); visited.add(n)
for n in by_id: visit(n)

if errors:
    print('TRACEABILITY AUDIT: FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print(f'TRACEABILITY AUDIT: PASS ({len(scns)} scenarios, {len(ors)} oracles, {len(dag["tasks"])} tasks)')
