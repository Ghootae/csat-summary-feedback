import argparse
import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from .llm import LLMClient


def load_json(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def read_text(path: Path) -> str:
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def render_prompt(template: str, variables: dict[str, str]) -> str:
    prompt = template
    for key, value in variables.items():
        prompt = prompt.replace("{{" + key + "}}", value)
    return prompt


def find_gold_files(input_path: Path) -> list[Path]:
    """
    input_path가 파일이면 그 파일만 처리.
    input_path가 폴더이면 하위 폴더까지 *_gold.json을 모두 처리.
    """
    if input_path.is_file():
        return [input_path]

    if input_path.is_dir():
        return sorted(input_path.rglob("*_gold.json"))

    raise FileNotFoundError(f"입력 경로를 찾을 수 없습니다: {input_path}")


def infer_ids_from_gold_path(gold_path: Path) -> tuple[str, str]:
    """
    예상 경로:
      data/golds/{passage_id}/P2_gold.json

    반환:
      passage_id, para_id
    """
    passage_id = gold_path.parent.name
    para_id = gold_path.stem

    if para_id.endswith("_gold"):
        para_id = para_id[:-5]

    return passage_id, para_id


def find_anchor_path(
    gold_path: Path,
    anchor_dir: Path,
    gold: dict[str, Any],
) -> Path:
    passage_id = str(gold.get("passage_id") or "")
    para_id = str(gold.get("para_id") or "")

    if not passage_id or not para_id:
        passage_id, para_id = infer_ids_from_gold_path(gold_path)

    return anchor_dir / passage_id / f"{para_id}_paragraph_anchor.json"


def build_output_path(
    gold_path: Path,
    output_dir: Path,
    gold: dict[str, Any],
) -> Path:
    passage_id = str(gold.get("passage_id") or "")
    para_id = str(gold.get("para_id") or "")

    if not passage_id or not para_id:
        passage_id, para_id = infer_ids_from_gold_path(gold_path)

    return output_dir / passage_id / f"{para_id}_importance.json"


def validate_importance_result(
    result: dict[str, Any],
    gold: dict[str, Any],
) -> None:
    """
    엄격한 검증은 하지 않지만, slot_id 누락/추가 정도는 감지한다.
    """
    gold_slots = gold.get("gold", {}).get("core_slots", [])
    expected_ids = {
        slot.get("slot_id")
        for slot in gold_slots
        if isinstance(slot, dict) and slot.get("slot_id")
    }

    result_slots = result.get("core_importance", [])
    actual_ids = {
        slot.get("slot_id")
        for slot in result_slots
        if isinstance(slot, dict) and slot.get("slot_id")
    }

    if expected_ids and actual_ids and expected_ids != actual_ids:
        missing = sorted(expected_ids - actual_ids)
        extra = sorted(actual_ids - expected_ids)
        raise ValueError(
            f"core_importance slot_id 불일치. missing={missing}, extra={extra}"
        )


def extract_importance_for_gold(
    gold_path: Path,
    anchor_dir: Path,
    prompt_template: str,
    output_dir: Path,
    temperature: float = 0.2,
    skip_existing: bool = False,
) -> Path | None:
    gold = load_json(gold_path)
    anchor_path = find_anchor_path(gold_path, anchor_dir, gold)

    if not anchor_path.exists():
        print(f"[SKIP] anchor 없음: {anchor_path}")
        return None

    output_path = build_output_path(gold_path, output_dir, gold)

    if skip_existing and output_path.exists():
        print(f"[SKIP] importance exists: {output_path}")
        return output_path

    anchor = load_json(anchor_path)

    passage_id = str(gold.get("passage_id") or anchor.get("passage_id") or "")
    para_id = str(gold.get("para_id") or anchor.get("para_id") or "")
    para_order = str(gold.get("para_order") or anchor.get("para_order") or "")

    prompt = render_prompt(
        prompt_template,
        {
            "passage_id": passage_id,
            "para_id": para_id,
            "para_order": para_order,
            "paragraph_anchor_json": json.dumps(anchor, ensure_ascii=False, indent=2),
            "gold_json": json.dumps(gold, ensure_ascii=False, indent=2),
        },
    )

    client = LLMClient()
    result = client.json_call(prompt, temperature=temperature)

    validate_importance_result(result, gold)

    save_json(result, output_path)
    return output_path


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="최종 GOLD core_slots에 importance score를 부여합니다."
    )

    parser.add_argument(
        "--input",
        default="data/golds",
        help="단일 *_gold.json 파일 또는 data/golds 폴더",
    )

    parser.add_argument(
        "--anchors",
        default="data/paragraph_anchors",
        help="paragraph anchor 저장 폴더",
    )

    parser.add_argument(
        "--prompt",
        default="prompts/07_score_core_importance.md",
        help="core importance scoring 프롬프트 경로",
    )

    parser.add_argument(
        "--out",
        default="data/core_importance",
        help="importance 결과 저장 폴더",
    )

    parser.add_argument(
        "--temperature",
        type=float,
        default=0.2,
        help="LLM temperature",
    )

    parser.add_argument(
        "--skip-existing",
        action="store_true",
        help="이미 생성된 *_importance.json 파일은 스킵",
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    anchor_dir = Path(args.anchors)
    prompt_path = Path(args.prompt)
    output_dir = Path(args.out)

    prompt_template = read_text(prompt_path)
    gold_files = find_gold_files(input_path)

    if not gold_files:
        raise RuntimeError(f"처리할 *_gold.json 파일이 없습니다: {input_path}")

    print(f"처리 대상 GOLD 수: {len(gold_files)}")

    success = 0
    skipped = 0
    failed = 0

    for gold_path in gold_files:
        try:
            output_path = extract_importance_for_gold(
                gold_path=gold_path,
                anchor_dir=anchor_dir,
                prompt_template=prompt_template,
                output_dir=output_dir,
                temperature=args.temperature,
                skip_existing=args.skip_existing,
            )

            if output_path is None:
                skipped += 1
            else:
                success += 1
                print(f"[DONE] {gold_path} -> {output_path}")

        except Exception as e:
            failed += 1
            print(f"[FAIL] {gold_path}")
            print(f"       {e}")

    print()
    print("core importance scoring 완료")
    print(f"성공/스킵/실패: {success}/{skipped}/{failed}")


if __name__ == "__main__":
    main()
