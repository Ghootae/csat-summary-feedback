import json
from pathlib import Path
from typing import Any


def read_text(path: str | Path) -> str:
    return Path(path).read_text(encoding="utf-8")


def read_json(path: str | Path) -> Any:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path: str | Path, data: Any) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def render_template(template: str, **kwargs: Any) -> str:
    out = template
    for k, v in kwargs.items():
        if not isinstance(v, str):
            v = json.dumps(v, ensure_ascii=False, indent=2)
        out = out.replace("{{" + k + "}}", v)
    return out


def split_paragraphs(passage: str) -> list[str]:
    return [p.strip() for p in passage.split("\n") if p.strip()]


def collect_candidate_core_slots(candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    collected: list[dict[str, Any]] = []
    for run_idx, cand in enumerate(candidates, start=1):
        slots = cand.get("gold", {}).get("core_slots", [])
        for slot in slots:
            if not isinstance(slot, dict):
                continue
            slot_id = slot.get("slot_id", "?")
            collected.append({
                "source_slot_id": f"run{run_idx}:{slot_id}",
                "text": slot.get("text"),
                "evidence_quote": slot.get("evidence_quote"),
            })
    return collected
