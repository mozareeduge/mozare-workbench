from pathlib import Path
import importlib.util, re, csv, json, yaml
from jsonschema import Draft202012Validator
ROOT=Path(__file__).resolve().parents[1]
errors=[]

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')

dag=yaml.safe_load(read('EXECUTION/TASK_DAG.yaml')); tasks=dag['tasks']; ids=[t['id'] for t in tasks]; idset=set(ids)
if len(ids)!=len(idset): errors.append('duplicate task IDs')
# deps + cycles
by={t['id']:t for t in tasks}
for t in tasks:
    for d in t.get('deps',[]):
        if d not in idset: errors.append(f"unknown dependency {d} in {t['id']}")
visiting=set(); visited=set()
def visit(n):
    if n in visiting: errors.append(f'cycle at {n}'); return
    if n in visited: return
    visiting.add(n)
    for d in by[n].get('deps',[]):
        if d in by: visit(d)
    visiting.remove(n); visited.add(n)
for n in ids: visit(n)
# all intake task tokens exist
intake=read('EXECUTION/CLAUDE_CODE_EXECUTION_INTAKE.md')
for tok in set(re.findall(r'TASK-P\d{2}-\d{2}',intake)):
    if tok not in idset: errors.append(f'intake references task absent from DAG: {tok}')
# scenario/oracle coverage
scns=set(re.findall(r'\bSCN-[A-Z0-9-]+',read('AUTHORITY/02_SCENARIO_CASE_ATLAS.md')))
ors=set(re.findall(r'\bORACLE-\d{3}\b',read('QA/QA_ORACLE_REGISTER.md')))
used_s={s for t in tasks for s in t.get('scenarios',[])}; used_o={o for t in tasks for o in t.get('oracles',[])}
for s in sorted(scns-used_s): errors.append(f'scenario has no task: {s}')
for o in sorted(ors-used_o): errors.append(f'oracle has no task: {o}')
for s in sorted(used_s-scns): errors.append(f'task references unknown scenario: {s}')
for o in sorted(used_o-ors): errors.append(f'task references unknown oracle: {o}')
# task cards
cards=yaml.safe_load(read('EXECUTION/TASK_CARDS.yaml'))
schema=json.loads(read('config/task-card.schema.json'))
for e in Draft202012Validator(schema).iter_errors(cards): errors.append('task card schema: '+e.message)
cb={c['task_id']:c for c in cards.get('cards',[])}
for tid in ids:
    if tid not in cb: errors.append(f'missing task card: {tid}')
for tid,c in cb.items():
    if tid not in idset: errors.append(f'orphan task card: {tid}')
    for rel in c.get('required_reads',[]):
        if not (ROOT/rel).exists(): errors.append(f'{tid} required_read missing: {rel}')
    for test in c.get('tests',[]):
        if test not in read('QA/CLAUDE_QA_CONTRACT.md'): errors.append(f'{tid} references undefined test: {test}')

# Every source-code target must agree with the locked repository blueprint.
blueprint=yaml.safe_load(read('EXECUTION/REPOSITORY_BLUEPRINT.yaml'))
blueprint_paths=[]
def collect_paths(value):
    if isinstance(value,list): blueprint_paths.extend(item for item in value if isinstance(item,str))
    elif isinstance(value,dict):
        for item in value.values(): collect_paths(item)
collect_paths(blueprint.get('modules',{}))
for tid,c in cb.items():
    for target in c.get('create_or_modify',[]):
        if not target.startswith('src/'): continue
        prefix=target.rstrip('/')+'/'
        if target not in blueprint_paths and not any(path.startswith(prefix) for path in blueprint_paths):
            errors.append(f'{tid} target conflicts with repository blueprint: {target}')
# traceability exact coverage
rows=list(csv.DictReader((ROOT/'EXECUTION/TRACEABILITY.csv').open(encoding='utf-8-sig')))
need={'task_id','scenario_id','oracle_ids','test_ids','gate'}
if not rows or not need.issubset(rows[0]): errors.append('TRACEABILITY.csv required columns missing')
for t in tasks:
    rs=[r for r in rows if r['task_id']==t['id']]
    if not rs: errors.append(f'task absent from trace CSV: {t["id"]}'); continue
    traced={r['scenario_id'] for r in rs if r['scenario_id']}
    if traced!=set(t.get('scenarios',[])): errors.append(f'scenario mismatch in trace CSV: {t["id"]}')
    traced_oracles=set(x for r in rs for x in r['oracle_ids'].split(';') if x)
    if traced_oracles!=set(t.get('oracles',[])): errors.append(f'oracle mismatch in trace CSV: {t["id"]}')
    if any(r['gate']!=t['gate'] for r in rs): errors.append(f'gate mismatch in trace CSV: {t["id"]}')
    tests=set(x for r in rs for x in r['test_ids'].split(';') if x)
    if tests!=set(cb[t['id']]['tests']): errors.append(f'test mismatch in trace CSV: {t["id"]}')

for rel in ['EXECUTION/IMPLEMENTATION_STACK_LOCK.yaml','EXECUTION/REPOSITORY_BLUEPRINT.yaml','EXECUTION/HARNESS_BOOTSTRAP_PROMPT.md','EXECUTION/CODEX_HARNESS_PROFILE.yaml','EXECUTION/FRESH_CONTEXT_PROMPT.md','EXECUTION/SYSTEM_EXECUTION_PLAN.md','QA/FINALIZATION_CHECKLIST.md','scripts/execution_loop.py']:
    if not (ROOT/rel).exists(): errors.append(f'missing light-model execution file: {rel}')

# The deterministic packet compiler must cover every task within the normal hard budget.
try:
    spec=importlib.util.spec_from_file_location('execution_loop',ROOT/'scripts/execution_loop.py')
    loop=importlib.util.module_from_spec(spec); spec.loader.exec_module(loop)
    for tid in ids:
        packet=loop.build_packet(tid)
        if packet['estimated_tokens']>packet['model_profile']['context_hard_tokens']:
            errors.append(f'{tid} packet exceeds hard context budget: {packet["estimated_tokens"]}')
        if any('exact clause not found' in line for line in packet['scenario_clauses']+packet['oracle_clauses']):
            errors.append(f'{tid} packet has unresolved scenario/oracle clause')
        if any('exact clause not found' in block for block in packet['test_clauses'].values()):
            errors.append(f'{tid} packet has unresolved test clause')
except Exception as exc:
    errors.append(f'task packet compiler failed: {exc}')

# stale ranges that can misdirect executor
if 'HZN-001..012' in intake: errors.append('stale protected horizon range HZN-001..012 in intake')
if 'DEC-001..018' in intake: errors.append('stale decision implementation range DEC-001..018 in intake')
if errors:
    print('EXECUTION CONTRACT: FAIL')
    for e in errors: print('-',e)
    raise SystemExit(1)
print(f'EXECUTION CONTRACT: PASS ({len(tasks)} tasks, {len(scns)} scenarios, {len(ors)} oracles, {len(cards["cards"])} task cards)')
