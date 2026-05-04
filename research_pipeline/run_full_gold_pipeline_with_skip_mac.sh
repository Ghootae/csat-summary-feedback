#!/bin/bash
set -e

# ============================================================
# Full GOLD Pipeline for macOS/Linux - SKIP EXISTING OUTPUTS
# Steps:
# 1) Normalize crawling results
# 2) Extract passage thesis
# 3) Extract paragraph anchors
# 4) Extract final GOLDs
# 5) Score core importance
# ============================================================

PYTHON="${PYTHON:-python}"

echo
echo "============================================================"
echo "[1/5] Normalize input result JSON files"
echo "============================================================"

mkdir -p data/normalized

shopt -s nullglob
RESULT_FILES=(data/input/*_result.json)

if [ ${#RESULT_FILES[@]} -eq 0 ]; then
  echo "[WARN] No *_result.json files found in data/input"
fi

for f in "${RESULT_FILES[@]}"; do
  base="$(basename "$f" _result.json)"
  out="data/normalized/${base}_passage.json"

  if [ -f "$out" ]; then
    echo "[SKIP] normalized exists: $out"
  else
    echo "[RUN ] normalize: $f"
    $PYTHON -m src.gold_ablation.normalize_input       --input "$f"       --out data/normalized
  fi
done

echo
echo "============================================================"
echo "[2/5] Extract passage thesis"
echo "============================================================"

mkdir -p data/thesis
PASSAGE_FILES=(data/normalized/*_passage.json)

if [ ${#PASSAGE_FILES[@]} -eq 0 ]; then
  echo "[ERROR] No *_passage.json files found in data/normalized"
  exit 1
fi

for f in "${PASSAGE_FILES[@]}"; do
  base="$(basename "$f" _passage.json)"
  out="data/thesis/${base}_thesis.json"

  if [ -f "$out" ]; then
    echo "[SKIP] thesis exists: $out"
  else
    echo "[RUN ] thesis: $f"
    $PYTHON -m src.gold_ablation.extract_passage_thesis --input "$f"
  fi
done

echo
echo "============================================================"
echo "[3/5] Extract paragraph anchors"
echo "============================================================"

for f in "${PASSAGE_FILES[@]}"; do
  base="$(basename "$f" _passage.json)"
  thesis="data/thesis/${base}_thesis.json"
  first_anchor="data/paragraph_anchors/${base}/P1_paragraph_anchor.json"

  if [ ! -f "$thesis" ]; then
    echo "[SKIP] thesis missing: $thesis"
    continue
  fi

  if [ -f "$first_anchor" ]; then
    echo "[SKIP] anchors appear to exist for $base"
  else
    echo "[RUN ] anchors: $f"
    $PYTHON -m src.gold_ablation.extract_paragraph_anchor       --input "$f"       --thesis "$thesis"       --prompt prompts/00b_extract_paragraph_anchor.md       --out data/paragraph_anchors       --temperature 0.2
  fi
done

echo
echo "============================================================"
echo "[4/5] Extract final GOLDs from paragraph anchors"
echo "============================================================"

ANCHOR_FILES=(data/paragraph_anchors/*/*_paragraph_anchor.json)

if [ ${#ANCHOR_FILES[@]} -eq 0 ]; then
  echo "[ERROR] No *_paragraph_anchor.json files found in data/paragraph_anchors"
  exit 1
fi

for f in "${ANCHOR_FILES[@]}"; do
  pid="$(basename "$(dirname "$f")")"
  para="$(basename "$f" _paragraph_anchor.json)"
  out="data/golds/${pid}/${para}_gold.json"

  if [ -f "$out" ]; then
    echo "[SKIP] gold exists: $out"
  else
    echo "[RUN ] gold: $f"
    $PYTHON -m src.gold_ablation.extract_gold_from_anchor       --input "$f"       --prompt prompts/06_extract_gold_from_anchor.md       --out data/golds       --temperature 0.2
  fi
done

echo
echo "============================================================"
echo "[5/5] Score core importance"
echo "============================================================"

mkdir -p data/core_importance
GOLD_FILES=(data/golds/*/*_gold.json)

if [ ${#GOLD_FILES[@]} -eq 0 ]; then
  echo "[ERROR] No *_gold.json files found in data/golds"
  exit 1
fi

for f in "${GOLD_FILES[@]}"; do
  pid="$(basename "$(dirname "$f")")"
  para="$(basename "$f" _gold.json)"
  anchor="data/paragraph_anchors/${pid}/${para}_paragraph_anchor.json"
  out="data/core_importance/${pid}/${para}_importance.json"

  if [ -f "$out" ]; then
    echo "[SKIP] importance exists: $out"
  elif [ ! -f "$anchor" ]; then
    echo "[SKIP] anchor missing for importance: $anchor"
  else
    echo "[RUN ] importance: $f"
    $PYTHON -m src.gold_ablation.extract_core_importance       --input "$f"       --anchors data/paragraph_anchors       --prompt prompts/07_score_core_importance.md       --out data/core_importance       --temperature 0.2
  fi
done

echo
echo "============================================================"
echo "DONE. Outputs:"
echo "  data/normalized"
echo "  data/thesis"
echo "  data/paragraph_anchors"
echo "  data/golds"
echo "  data/core_importance"
echo "============================================================"
