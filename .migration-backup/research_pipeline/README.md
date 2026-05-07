# GOLD Ablation Experiment

문단 GOLD를 단일 프롬프트 한 번으로 확정하지 않고,
후보 다수 생성 → 병합 → leave-one-out ablation → 최종 prune 방식으로 실험하는 로컬 프로젝트입니다.

## 핵심 원칙

- GOLD 생성은 문단 독해 기준입니다.
- 문제 정보는 GOLD 생성에 사용하지 않습니다.
- `*_questions.json`은 보관하되, 현재 파이프라인의 주 입력은 `*_result.json`입니다.
- 이유: `questions.json`에는 제시문 본문이 없고, GOLD는 `passage`가 필요합니다.

## 설치

```bash
cd gold_ablation_project
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# .env에 OPENAI_API_KEY / OPENAI_MODEL 입력
```

## 실행 예시

그라피티 지문의 2번째 문단(0-based index 기준 `1`)으로 후보 5개를 만들고 ablation까지 실행:

```bash
python -m src.gold_ablation.pipeline \
  --input data/input/69c37a0c1d65ab18e18f9f61_result.json \
  --para-index 1 \
  --runs 5 \
  --out outputs/graffiti_p2
```

전체 제시문을 하나의 입력으로 실험하려면:

```bash
python -m src.gold_ablation.pipeline \
  --input data/input/69c37a0c1d65ab18e18f9f61_result.json \
  --whole-passage \
  --runs 5 \
  --out outputs/graffiti_whole
```

## 출력 구조

```text
outputs/graffiti_p2/
  input_para.json
  candidates/
    candidate_01.json
    candidate_02.json
    ...
  merged_slots.json
  ablation/
    without_M1_reconstruction.json
    without_M1_loss.json
    ...
  final_gold.json
```

## 단계

1. 후보 GOLD 여러 개 생성
2. 모든 core slot 수집
3. 의미 중복 병합
4. 각 slot을 하나씩 제거하고 남은 slot으로 문단 의미 재구성
5. 원문과 비교해 손실 평가
6. 중요도 낮은 slot 삭제 또는 optional 이동

