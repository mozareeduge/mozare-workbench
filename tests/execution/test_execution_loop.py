import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location("execution_loop", ROOT / "scripts" / "execution_loop.py")
LOOP = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LOOP)


def test_every_task_packet_is_complete_and_bounded():
    for task in LOOP.load_dag():
        packet = LOOP.build_packet(task["id"])
        assert packet["estimated_tokens"] <= packet["model_profile"]["context_hard_tokens"]
        assert not any("exact clause not found" in clause for clause in packet["scenario_clauses"])
        assert not any("exact clause not found" in clause for clause in packet["oracle_clauses"])
        assert not any("exact clause not found" in clause for clause in packet["test_clauses"].values())


def test_bootstrap_tasks_have_dedicated_proofs():
    packets = {task_id: LOOP.build_packet(task_id) for task_id in ("TASK-P00-01", "TASK-P00-02")}
    assert packets["TASK-P00-01"]["task"]["oracles"] == ["ORACLE-043"]
    assert packets["TASK-P00-01"]["card"]["tests"] == ["TEST-020"]
    assert packets["TASK-P00-02"]["task"]["oracles"] == ["ORACLE-044"]
    assert packets["TASK-P00-02"]["card"]["tests"] == ["TEST-021"]


def test_first_ready_task_is_deterministic():
    state = LOOP.initial_state()
    assert LOOP.next_task(state, LOOP.load_dag())["id"] == "TASK-P00-01"
    state["completed"].append("TASK-P00-01")
    assert LOOP.next_task(state, LOOP.load_dag())["id"] == "TASK-P00-02"
