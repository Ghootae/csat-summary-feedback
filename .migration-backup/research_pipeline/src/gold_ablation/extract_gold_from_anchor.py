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


def find_anchor_files(input_path: Path) -> list[Path]:
    """
    input_path가 파일이면 그 파일만 처리.
    input_path가 폴더이면 하위 폴더까지 *_paragraph_anchor.json을 모두 처리.
    """
    if input_path.is_file():
        return [input_path]

    if input_path.is_dir():
        return sorted(input_path.rglob("*_paragraph_anchor.json"))

    raise FileNotFoundError(f"입력 경로를 찾을 수 없습니다: {input_path}")


def build_output_path(anchor: dict[str, Any], output_dir: Path) -> Path:
    passage_id = anchor.get("passage_id") or "unknown_passage"
    para_id = anchor.get("para_id") or "unknown_para"

    return output_dir / str(passage_id) / f"{para_id}_gold.json"


def extract_gold_from_anchor(
    anchor_path: Path,
    prompt_template: str,
    output_dir: Path,
    temperature: float = 0.2,
) -> Path:
    anchor = load_json(anchor_path)

    passage_id = str(anchor.get("passage_id", ""))
    para_id = str(anchor.get("para_id", ""))
    para_order = str(anchor.get("para_order", ""))

    prompt = render_prompt(
        prompt_template,
        {
            "passage_id": passage_id,
            "para_id": para_id,
            "para_order": para_order,
            "paragraph_anchor_json": json.dumps(anchor, ensure_ascii=False, indent=2),
        },
    )

    client = LLMClient()
    result = client.json_call(prompt, temperature=temperature)

    output_path = build_output_path(anchor, output_dir)
    save_json(result, output_path)

    return output_path


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="paragraph_anchor JSON을 바탕으로 최종 GOLD를 생성합니다."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="단일 *_paragraph_anchor.json 파일 또는 data/paragraph_anchors 폴더",
    )

    parser.add_argument(
        "--prompt",
        default="prompts/06_extract_gold_from_anchor.md",
        help="GOLD 생성 프롬프트 경로",
    )

    parser.add_argument(
        "--out",
        default="data/golds",
        help="최종 GOLD 저장 폴더",
    )

    parser.add_argument(
        "--temperature",
        type=float,
        default=0.2,
        help="LLM temperature",
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    prompt_path = Path(args.prompt)
    output_dir = Path(args.out)

    prompt_template = read_text(prompt_path)
    anchor_files = find_anchor_files(input_path)

    if not anchor_files:
        raise RuntimeError(f"처리할 *_paragraph_anchor.json 파일이 없습니다: {input_path}")

    print(f"처리 대상 paragraph_anchor 수: {len(anchor_files)}")

    for anchor_path in anchor_files:
        try:
            output_path = extract_gold_from_anchor(
                anchor_path=anchor_path,
                prompt_template=prompt_template,
                output_dir=output_dir,
                temperature=args.temperature,
            )
            print(f"완료: {anchor_path} -> {output_path}")

        except Exception as e:
            print(f"실패: {anchor_path}")
            print(f"  이유: {e}")

    print("GOLD 생성 완료")


if __name__ == "__main__":
    main()