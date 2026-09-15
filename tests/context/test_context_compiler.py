import importlib.util, json
from pathlib import Path
import yaml
ROOT=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('cc',ROOT/'scripts/context_compiler.py'); cc=importlib.util.module_from_spec(spec); spec.loader.exec_module(cc)

def load():
    return yaml.safe_load((ROOT/'CONTEXT/examples/mission-input.yaml').read_text()), yaml.safe_load((ROOT/'CONTEXT/context-policy.yaml').read_text())

def test_dedup_and_role_scope():
    inp,pol=load(); out=cc.compile_packet(inp,pol)
    refs=[x['ref'] for x in out['items']]
    assert refs.count('DEC-014')==1
    assert 'HISTORY-long' not in refs
    assert out['metrics']['duplicate_count']==1

def test_budget_is_present_and_nonzero():
    inp,pol=load(); out=cc.compile_packet(inp,pol)
    assert out['budget']['target_tokens']==1800
    assert 0 < out['budget']['estimated_tokens'] <= out['budget']['hard_tokens']

def test_critical_survives_tight_budget():
    inp,pol=load(); pol['budgets']['normal_mission']={'target_tokens':30,'hard_tokens':40}; out=cc.compile_packet(inp,pol)
    assert all(any(i['ref']==r for i in out['items']) for r in ['DEC-014','SCN-RSP-04','OBJ-REVIEW'])
    assert out['escalation_reason'] is not None
