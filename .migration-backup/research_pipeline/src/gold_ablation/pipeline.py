import argparse
from pathlib import Path
from typing import Any

from .llm import LLMClient
from .utils import (
    collect_candidate_core_slots,
    read_json,
    read_text,
    render_template,
    split_paragraphs,
    write_json,
)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROMPT_DIR = PROJECT_ROOT / "prompts"


def load_para(input_path: Path, para_index: int | None, whole_passage: bool) -> dict[str, Any]:
    data = read_json(input_path)
    if "passage" not in data:
        raise RuntimeError(
            "Input JSON has no 'passage'. Use a *_result.json file, not only *_questions.json."
        )

    passage = data["passage"]
    if whole_passage:
        para_text = passage
        para_id = f"{data.get('product_id', input_path.stem)}:whole"
    else:
        paras = split_paragraphs(passage)
        idx = 0 if para_index is None else para_index
        if idx < 0 or idx >= len(paras):
            raise RuntimeError(f"para-index {idx} out of range. Paragraph count: {len(paras)}")
        para_text = paras[idx]
        para_id = f"{data.get('product_id', input_path.stem)}:P{idx+1}"

    return {
        "para_id": para_id,
        "para_text": para_text,
        "source": {
            "input_path": str(input_path),
            "title": data.get("title"),
            "exam": data.get("exam"),
            "question_range": data.get("question_range"),
            "product_id": data.get("product_id"),
        },
    }


def generate_candidates(llm: LLMClient, para: dict[str, Any], runs: int, out_dir: Path) -> list[dict[str, Any]]:
    template = read_text(PROMPT_DIR / "01_generate_candidate.md")
    candidates = []
    cand_dir = out_dir / "candidates"
    cand_dir.mkdir(parents=True, exist_ok=True)

    for i in range(1, runs + 1):
        prompt = render_template(
            template,
            para_id=para["para_id"],
            para_text=para["para_text"],
        )
        # Slight variation. Determinism is not the goal at candidate stage.
        cand = llm.json_call(prompt, temperature=0.8)
        candidates.append(cand)
        write_json(cand_dir / f"candidate_{i:02d}.json", cand)
        print(f"candidate {i}/{runs} saved")

    return candidates


def merge_slots(llm: LLMClient, para: dict[str, Any], candidates: list[dict[str, Any]], out_dir: Path) -> dict[str, Any]:
    template = read_text(PROMPT_DIR / "02_merge_slots.md")
    candidate_slots = collect_candidate_core_slots(candidates)
    write_json(out_dir / "candidate_core_slots_all.json", candidate_slots)

    prompt = render_template(
        template,
        para_id=para["para_id"],
        para_text=para["para_text"],
        candidate_core_slots_json=candidate_slots,
    )
    merged = llm.json_call(prompt, temperature=0.2)
    write_json(out_dir / "merged_slots.json", merged)
    print("merged_slots.json saved")
    return merged


def reconstruct_without(llm: LLMClient, para: dict[str, Any], merged_slots: list[dict[str, Any]], removed: dict[str, Any], out_dir: Path) -> dict[str, Any]:
    template = read_text(PROMPT_DIR / "03_reconstruct.md")
    removed_id = removed["merged_slot_id"]
    remaining = [s for s in merged_slots if s.get("merged_slot_id") != removed_id]
    prompt = render_template(
        template,
        para_id=para["para_id"],
        removed_slot_id=removed_id,
        remaining_slots_json=remaining,
    )
    result = llm.json_call(prompt, temperature=0.1)
    write_json(out_dir / f"without_{removed_id}_reconstruction.json", result)
    return result


def evaluate_loss(llm: LLMClient, para: dict[str, Any], merged_slots: list[dict[str, Any]], removed: dict[str, Any], reconstruction: dict[str, Any], out_dir: Path) -> dict[str, Any]:
    template = read_text(PROMPT_DIR / "04_ablation_loss.md")
    removed_id = removed["merged_slot_id"]
    remaining = [s for s in merged_slots if s.get("merged_slot_id") != removed_id]
    prompt = render_template(
        template,
        para_id=para["para_id"],
        para_text=para["para_text"],
        removed_slot_json=removed,
        remaining_slots_json=remaining,
        reconstruction_json=reconstruction,
    )
    result = llm.json_call(prompt, temperature=0.1)
    write_json(out_dir / f"without_{removed_id}_loss.json", result)
    return result


def run_ablation(llm: LLMClient, para: dict[str, Any], merged: dict[str, Any], out_dir: Path) -> list[dict[str, Any]]:
    merged_slots = merged.get("merged_core_slots", [])
    ab_dir = out_dir / "ablation"
    ab_dir.mkdir(parents=True, exist_ok=True)
    losses = []

    for slot in merged_slots:
        slot_id = slot.get("merged_slot_id")
        if not slot_id:
            continue
        print(f"ablation: remove {slot_id}")
        recon = reconstruct_without(llm, para, merged_slots, slot, ab_dir)
        loss = evaluate_loss(llm, para, merged_slots, slot, recon, ab_dir)
        losses.append(loss)

    write_json(out_dir / "ablation_results.json", losses)
    return losses


def final_prune(llm: LLMClient, para: dict[str, Any], merged: dict[str, Any], losses: list[dict[str, Any]], out_dir: Path) -> dict[str, Any]:
    template = read_text(PROMPT_DIR / "05_final_prune.md")
    prompt = render_template(
        template,
        para_id=para["para_id"],
        para_text=para["para_text"],
        merged_slots_json=merged,
        ablation_results_json=losses,
    )
    final = llm.json_call(prompt, temperature=0.1)
    write_json(out_dir / "final_gold.json", final)
    print("final_gold.json saved")
    return final


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--para-index", type=int, default=None)
    parser.add_argument("--whole-passage", action="store_true")
    parser.add_argument("--runs", type=int, default=5)
    parser.add_argument("--out", required=True, type=Path)
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    para = load_para(args.input, args.para_index, args.whole_passage)
    write_json(args.out / "input_para.json", para)

    llm = LLMClient()
    candidates = generate_candidates(llm, para, args.runs, args.out)
    merged = merge_slots(llm, para, candidates, args.out)
    losses = run_ablation(llm, para, merged, args.out)
    final_prune(llm, para, merged, losses, args.out)

    print("done")


if __name__ == "__main__":
    main()
