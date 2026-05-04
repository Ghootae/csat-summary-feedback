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


def extract_passage_thesis(
    normalized_path: Path,
    prompt_path: Path,
    output_path: Path,
) -> Path:
    data = load_json(normalized_path)

    passage_id = data.get("passage_id")
    passage_text = data.get("passage_text")
    paragraphs = data.get("paragraphs")

    if not isinstance(passage_id, str) or not passage_id.strip():
        raise ValueError("normalized file에 passage_id가 없습니다.")

    if not isinstance(passage_text, str) or not passage_text.strip():
        raise ValueError("normalized file에 passage_text가 없습니다.")

    if not isinstance(paragraphs, list) or not paragraphs:
        raise ValueError("normalized file에 paragraphs가 없습니다.")

    template = read_text(prompt_path)

    prompt = render_prompt(
        template,
        {
            "passage_id": passage_id,
            "passage_text": passage_text,
            "paragraphs_json": json.dumps(paragraphs, ensure_ascii=False, indent=2),
        },
    )

    client = LLMClient()
    result = client.json_call(prompt, temperature=0.2)

    save_json(result, output_path)
    return output_path


def main() -> None:
    load_dotenv()

    parser = argparse.ArgumentParser(
        description="normalized_passage JSON에서 제시문 전체 thesis를 추출합니다."
    )

    parser.add_argument(
        "--input",
        required=True,
        help="data/normalized/*_passage.json 파일 경로",
    )

    parser.add_argument(
        "--prompt",
        default="prompts/00_extract_passage_thesis.md",
        help="passage thesis 추출 프롬프트 경로",
    )

    parser.add_argument(
        "--out",
        default=None,
        help="출력 파일 경로. 생략하면 data/thesis/{passage_id}_thesis.json",
    )

    args = parser.parse_args()

    normalized_path = Path(args.input)
    prompt_path = Path(args.prompt)

    data = load_json(normalized_path)
    passage_id = data.get("passage_id") or normalized_path.stem.replace("_passage", "")

    if args.out:
        output_path = Path(args.out)
    else:
        output_path = Path("data/thesis") / f"{passage_id}_thesis.json"

    out = extract_passage_thesis(
        normalized_path=normalized_path,
        prompt_path=prompt_path,
        output_path=output_path,
    )

    print(f"passage thesis 저장 완료: {out}")


if __name__ == "__main__":
    main()