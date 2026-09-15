from __future__ import annotations
import argparse, json, re
from pathlib import Path
import yaml

ROOT=Path(__file__).resolve().parents[1]

def estimate_tokens(text:str)->int:
    # Deterministic conservative estimate for local budgeting; provider-reported tokens replace it in telemetry when available.
    words=len(re.findall(r"\w+|[^\w\s]", text, flags=re.UNICODE))
    chars=len(text)
    return max(1, round(max(words*1.25, chars/3.6)))

def dedupe(items):
    out=[]; seen=set(); duplicates=0
    for item in items:
        ref=item['ref']
        if ref in seen:
            duplicates+=1; continue
        seen.add(ref); out.append(dict(item))
    return out, duplicates

def serialize_core(doc):
    return json.dumps(doc, ensure_ascii=False, separators=(',',':'))

def compile_packet(inp, policy):
    budget=policy['budgets'][inp['budget']]
    items, duplicate_count=dedupe(inp.get('items',[]))
    # profile-specific exclusion: demo/reference compiler understands only explicit "unrelated" marker;
    # production implementation must use typed relevance metadata, never substring heuristics.
    if inp.get('profile')=='technical':
        items=[x for x in items if not x['ref'].startswith('HISTORY-')]
    packet={
      'id':'CTX-'+inp['mission_id'], 'mission_id':inp['mission_id'], 'profile':inp['profile'],
      'budget':{'target_tokens':budget['target_tokens'],'hard_tokens':budget['hard_tokens'],'estimated_tokens':0,'tier':inp['budget']},
      'authority':inp.get('authority',[]), 'objective':inp['objective'], 'snapshot_id':inp.get('snapshot_id'), 'delta_id':inp.get('delta_id'),
      'items':items, 'expansion_handles':inp.get('expansion_handles',[]), 'omitted':[], 'escalation_reason':None
    }
    def size(): return estimate_tokens(serialize_core(packet))
    packet['budget']['estimated_tokens']=size()
    # Compact secondary material in deterministic order; never silently drop critical items.
    if packet['budget']['estimated_tokens']>budget['target_tokens']:
        for item in reversed(items):
            if item.get('critical'): continue
            if item['level']=='L2':
                item['level']='L1'; item['text']=item['text'][:120].rstrip()
                packet['budget']['estimated_tokens']=size()
                if packet['budget']['estimated_tokens']<=budget['target_tokens']: break
    if packet['budget']['estimated_tokens']>budget['hard_tokens']:
        packet['escalation_reason']='required context exceeds hard budget after safe compaction'
    packet['budget']['estimated_tokens']=size()
    total=max(1,len(inp.get('items',[])))
    packet['metrics']={'duplicate_count':duplicate_count,'duplicate_ratio':duplicate_count/total}
    return packet

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('input'); ap.add_argument('--policy',default=str(ROOT/'CONTEXT/context-policy.yaml')); ap.add_argument('--out')
    a=ap.parse_args(); inp=yaml.safe_load(Path(a.input).read_text(encoding='utf-8')); policy=yaml.safe_load(Path(a.policy).read_text(encoding='utf-8'))
    out=compile_packet(inp,policy); data=json.dumps(out,ensure_ascii=False,indent=2)
    if a.out: Path(a.out).write_text(data+'\n',encoding='utf-8')
    print(data)
if __name__=='__main__': main()
