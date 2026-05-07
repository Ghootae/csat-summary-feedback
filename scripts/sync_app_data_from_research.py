from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]

RESEARCH_DATA = ROOT / "research_pipeline" / "data"
APP_DATA = ROOT / "app_web" / "data"

RESEARCH_GOLDS = RESEARCH_DATA / "golds"
RESEARCH_IMPORTANCE = RESEARCH_DATA / "core_importance"
RESEARCH_NORMALIZED = RESEARCH_DATA / "normalized"

APP_GOLDS = APP_DATA / "golds"
APP_IMPORTANCE = APP_DATA / "core_importance"
APP_PARAGRAPHS = APP_DATA / "paragraphs"
APP_MANIFEST = APP_PARAGRAPHS / "manifest.json"


def copy_dir(src: Path, dst: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(f"Source folder not found: {src}")

    if dst.exists():
        shutil.rmtree(dst)

    shutil.copytree(src, dst)
    print(f"Copied: {src} -> {dst}")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def build_manifest():
    manifest = []
    skipped = []

    if not RESEARCH_NORMALIZED.exists():
        raise FileNotFoundError(f"Normalized folder not found: {RESEARCH_NORMALIZED}")

    for normalized_path in sorted(RESEARCH_NORMALIZED.glob("*_passage.json")):
        data = load_json(normalized_path)

        passage_id = data.get("passage_id") or data.get("product_id")
        title = data.get("title", "")
        paragraphs = data.get("paragraphs", [])

        if not passage_id:
            print(f"Skip normalized file without passage_id: {normalized_path}")
            continue

        for para in paragraphs:
            para_id = para.get("para_id")
            para_order = para.get("para_order")
            paragraph_text = para.get("text", "")

            if not para_id:
                skipped.append(
                    {
                        "passage_id": passage_id,
                        "para_id": None,
                        "reason": "missing para_id",
                    }
                )
                continue

            gold_file = APP_GOLDS / passage_id / f"{para_id}_gold.json"
            importance_file = APP_IMPORTANCE / passage_id / f"{para_id}_importance.json"

            if not gold_file.exists():
                skipped.append(
                    {
                        "passage_id": passage_id,
                        "para_id": para_id,
                        "reason": f"missing gold file: {gold_file}",
                    }
                )
                continue

            if not importance_file.exists():
                skipped.append(
                    {
                        "passage_id": passage_id,
                        "para_id": para_id,
                        "reason": f"missing importance file: {importance_file}",
                    }
                )
                continue

            manifest.append(
                {
                    "passage_id": passage_id,
                    "para_id": para_id,
                    "para_order": para_order,
                    "title": title,
                    "paragraph_text": paragraph_text,
                    "gold_path": f"data/golds/{passage_id}/{para_id}_gold.json",
                    "importance_path": 
f"data/core_importance/{passage_id}/{para_id}_importance.json",
                }
            )

    manifest.sort(key=lambda x: (x["title"], x["passage_id"], x["para_order"] or 0))

    APP_PARAGRAPHS.mkdir(parents=True, exist_ok=True)

    with APP_MANIFEST.open("w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print()
    print("Manifest generated")
    print(f"- path: {APP_MANIFEST}")
    print(f"- included paragraphs: {len(manifest)}")
    print(f"- skipped paragraphs: {len(skipped)}")

    if skipped:
        print()
        print("Skipped items:")
        for item in skipped:
            print(f"- {item['passage_id']} {item['para_id']}: {item['reason']}")


def main():
    APP_DATA.mkdir(parents=True, exist_ok=True)

    copy_dir(RESEARCH_GOLDS, APP_GOLDS)
    copy_dir(RESEARCH_IMPORTANCE, APP_IMPORTANCE)

    build_manifest()


if __name__ == "__main__":
    main()
