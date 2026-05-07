import argparse
import json
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from .llm import LLMClient
from .utils import read_text


def load_json(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def render_prompt(template: str, variables: dict[str, str]) -> str:
    prompt = template
    for key, value in variables.items():
        prompt = prompt.replace("{{" + key + "}}", value)
    return prompt


def compact_passage_anchor(thesis: dict[str, Any]) -> dict[str, Any]:
    """
    paragraph anchor 생성에 필요한 passage anchor 핵심 정보만 추린다.
    """
    central_object = thesis.get("central_object", "")
    if isinstance(central_object, dict):
        central_object_text = central_object.get("text", "")
    else:
        central_object_text = central_object

    return {
        "central_object": central_object_text,
        "main_axis_type": thesis.get("main_axis_type", ""),
        "main_axis": thesis.get("main_axis", ""),
        "passage_thesis": thesis.get("passage_thesis", ""),
    }


def extract_one_paragraph_anchor(
    normalized: dict[str, Any],
    thesis: dict[str, Any],
    paragraph: dict[str, Any],
    prompt_template: str,
    output_dir: Path,
    temperature: float = 0.2,
) -> Path:
    passage_id = normalized["passage_id"]
    para_id = paragraph["para_id"]
    para_order = paragraph["para_order"]
    para_text = paragraph["text"]

    passage_anchor = compact_passage_anchor(thesis)

    prompt = render_prompt(
        prompt_template,
        {
            "passage_id": str(passage_id),
            "para_id": str(para_id),
            "para_order": str(para_order),
            "passage_anchor_json": json.dumps(
                passage_anchor,
                ensure_ascii=False,
                indent=2,
            ),
            "para_text": para_text,
        },
    )

    client = LLMClient()
    result = client.json_call(prompt, temperature=temperature)

    output_path = output_dir / str(passage_id) / f"{para_id}_paragraph_anchor.json"
    save_json(result, output_path)

    return output_path


def find_thesis_path(normalized_path: Path, thesis_dir: Path) -> Path:
    """
    normalized 파일명:
      69c37a0c1d65ab18e18f9f61_passage.json

    thesis 파일명:
      69c37a0c1d65ab18e18f9f61_thesis.json
    """
    stem = normalized_path.stem

    if stem.endswith("_passage"):
        passage_id = stem[:-8]
    else:
        passage_id = stem

    return thesis_dir / f"{passage_id}_thesis.json"


def run_for_file(
    normalized_path: Path,
    thesis_path: Path,
    prompt_path: Path,
    output_dir: Path,
    para_index: int | None,
    temperature: float,
) -> None:
    normalized = load_json(normalized_path)
    thesis = load_json(thesis_path)
    prompt_template = read_text(prompt_path)

    paragraphs = normalized.get("paragraphs")
    if not isinstance(paragraphs, list) or not paragraphs:
        raise ValueError(f"paragraphs가 없습니다: {normalized_path}")

    if para_index is not None:
        if para_index < 0 or para_index >= len(paragraphs):
            raise IndexError(
                f"para-index 범위 오류: {para_index}, 문단 수={len(paragraphs)}"
            )
        target_paragraphs = [paragraphs[para_index]]
    else:
        target_paragraphs = paragraphs

    print(f"입력: {normalized_path}")
    print(f"thesis: {thesis_path}")
    print(f"문단 수: {len(target_paragraphs)}")

    for paragraph in target_paragraphs:
        out = extract_one_paragraph_anchor(
            normalized=normalized,
            thesis=thesis,
            paragraph=paragraph,
            prompt_template=prompt_template,
            output_dir=output_dir,
            temperature=temperature,
        )
        print(f"  저장 완료: {out}")


def find_normalized_files(input_path: Path) -> list[Path]:
    if input_path.is_file():
        return [input_path]

    if input_path.is_dir():
        return sorted(input_path.glob("*_passage.json"))

    raise FileNotFoundError(f"입력 경로를 찾을 수 없습니다: {input_path}")


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="normalized_passage와 passage_thesis를 이용해 paragraph_anchor를 생성합니다."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="*_passage.json 파일 또는 data/normalized 폴더",
    )

    parser.add_argument(
        "--thesis",
        default=None,
        help="단일 thesis 파일 경로. 폴더 입력 시 생략하고 --thesis-dir 사용 권장",
    )

    parser.add_argument(
        "--thesis-dir",
        default="data/thesis",
        help="*_thesis.json 파일들이 들어 있는 폴더",
    )

    parser.add_argument(
        "--prompt",
        default="prompts/00b_extract_paragraph_anchor.md",
        help="paragraph anchor 추출 프롬프트 경로",
    )

    parser.add_argument(
        "--out",
        default="data/paragraph_anchors",
        help="paragraph anchor 저장 폴더",
    )

    parser.add_argument(
        "--para-index",
        type=int,
        default=None,
        help="특정 문단만 실행할 때 사용. 0부터 시작. 생략하면 모든 문단 실행",
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
    thesis_dir = Path(args.thesis_dir)

    normalized_files = find_normalized_files(input_path)

    if not normalized_files:
        raise RuntimeError(f"처리할 *_passage.json 파일이 없습니다: {input_path}")

    print(f"처리 대상 passage 수: {len(normalized_files)}")

    for normalized_path in normalized_files:
        try:
            if args.thesis:
                thesis_path = Path(args.thesis)
            else:
                thesis_path = find_thesis_path(normalized_path, thesis_dir)

            if not thesis_path.exists():
                print(f"스킵: thesis 파일 없음 → {thesis_path}")
                continue

            run_for_file(
                normalized_path=normalized_path,
                thesis_path=thesis_path,
                prompt_path=prompt_path,
                output_dir=output_dir,
                para_index=args.para_index,
                temperature=args.temperature,
            )

        except Exception as e:
            print(f"실패: {normalized_path}")
            print(f"  이유: {e}")

    print("paragraph anchor 생성 완료")


if __name__ == "__main__":
    main()