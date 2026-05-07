import argparse
import json
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(data: dict[str, Any], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def split_paragraphs(passage_text: str) -> list[dict[str, Any]]:
    """
    passage 텍스트를 줄바꿈 기준으로 문단 분리한다.
    현재 gugeodat 크롤링 결과는 문단 사이가 \\n으로 구분되어 있으므로
    1차 기준은 줄바꿈이다.
    """
    raw_paragraphs = [
        p.strip()
        for p in passage_text.split("\n")
        if p.strip()
    ]

    paragraphs = []
    for idx, text in enumerate(raw_paragraphs, start=1):
        paragraphs.append({
            "para_id": f"P{idx}",
            "para_order": idx,
            "text": text
        })

    return paragraphs


def extract_passage_id(result: dict[str, Any], input_path: Path) -> str:
    """
    product_id가 있으면 그것을 passage_id로 사용하고,
    없으면 파일명에서 _result를 제거한 값을 사용한다.
    """
    product_id = result.get("product_id")
    if isinstance(product_id, str) and product_id.strip():
        return product_id.strip()

    stem = input_path.stem
    if stem.endswith("_result"):
        stem = stem[:-7]

    return stem


def build_normalized_result(result: dict[str, Any], input_path: Path) -> dict[str, Any]:
    passage_text = result.get("passage")

    if not isinstance(passage_text, str) or not passage_text.strip():
        raise ValueError(f"passage 필드가 없거나 비어 있습니다: {input_path}")

    passage_id = extract_passage_id(result, input_path)
    paragraphs = split_paragraphs(passage_text)

    normalized = {
        "schema_version": "normalized_passage_v1",
        "passage_id": passage_id,
        "source_file": str(input_path),
        "url": result.get("url"),
        "product_id": result.get("product_id"),
        "title": result.get("title"),
        "exam": result.get("exam"),
        "question_range": result.get("question_range"),
        "instruction": result.get("instruction"),
        "passage_text": passage_text,
        "paragraphs": paragraphs,
        "passage_elements": result.get("passage_elements", []),
        "passage_tags": result.get("passage_tags", []),
        "image_urls": result.get("image_urls", []),
        "questions": result.get("questions", []),
        "metadata": {
            "num_paragraphs": len(paragraphs),
            "has_images": bool(result.get("image_urls")),
            "has_questions": bool(result.get("questions")),
        }
    }

    return normalized


def normalize_one(input_path: Path, output_dir: Path) -> Path:
    result = load_json(input_path)
    normalized = build_normalized_result(result, input_path)

    passage_id = normalized["passage_id"]
    output_path = output_dir / f"{passage_id}_passage.json"

    save_json(normalized, output_path)
    return output_path


def find_result_files(input_path: Path) -> list[Path]:
    """
    input_path가 파일이면 그 파일만 처리.
    디렉터리면 *_result.json 파일을 모두 처리.
    """
    if input_path.is_file():
        return [input_path]

    if input_path.is_dir():
        return sorted(input_path.glob("*_result.json"))

    raise FileNotFoundError(f"입력 경로를 찾을 수 없습니다: {input_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="gugeodat 크롤링 result.json을 GOLD 실험용 normalized passage JSON으로 변환합니다."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="*_result.json 파일 또는 해당 파일들이 들어 있는 폴더 경로"
    )

    parser.add_argument(
        "--out",
        default="data/normalized",
        help="normalized passage JSON 저장 폴더"
    )

    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.out)

    result_files = find_result_files(input_path)

    if not result_files:
        raise RuntimeError(f"처리할 *_result.json 파일이 없습니다: {input_path}")

    print(f"처리 대상 파일 수: {len(result_files)}")

    for path in result_files:
        try:
            output_path = normalize_one(path, output_dir)
            print(f"완료: {path} -> {output_path}")
        except Exception as e:
            print(f"실패: {path}")
            print(f"  이유: {e}")

    print("정규화 완료")


if __name__ == "__main__":
    main()