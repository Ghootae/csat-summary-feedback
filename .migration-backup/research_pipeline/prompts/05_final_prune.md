너는 최종 GOLD 선별기다.

목표:
병합된 후보 슬롯과 leave-one-out ablation 결과를 바탕으로 최종 core_slots와 optional_slots를 확정한다.

핵심 원칙:
- 최종 GOLD는 “점수 상위 슬롯 목록”이 아니다.
- 최종 GOLD는 문단 독해에 필요한 주요 의미 축을 보존한 최소 사고 구조다.
- 단순히 중요도 점수가 높은 슬롯만 남기지 않는다.
- 각 슬롯의 final_importance_score를 계산하고, hard rules를 함께 적용하여 결정한다.
- derived는 생성하지 않는다.
- 출력은 JSON만 한다.

────────────────────────
[점수 계산 규칙]

각 merged slot에 대해 final_importance_score를 계산한다.

final_importance_score =
0.35 * relation_loss
+ 0.30 * flow_loss
+ 0.25 * coverage_loss
+ 0.10 * frequency_score
+ role_bonus

frequency_score:
- 여러 candidate_gold에서 반복 등장한 의미일수록 높게 준다.
- 0.0~1.0 사이 값으로 추정한다.
- 정확한 빈도 정보가 없으면 merged_slots의 source 후보 수와 표현 반복성을 근거로 추정한다.

role_bonus:
- 결론/평가 슬롯: +0.15
- 중간 전환/메커니즘 슬롯: +0.10
- 문단의 주요 의미 축을 대표하는 유일 슬롯: +0.10
- 단순 배경/기원/예시 슬롯: -0.15
- 중복/병합 가능 슬롯: -0.20
- 목적/문제의식 슬롯: +0.10

주의:
- ablation_results의 importance_score를 그대로 따르지 말고, 위 계산식으로 final_importance_score를 다시 산정한다.
- ablation_results의 coverage_loss, relation_loss, flow_loss는 참고 자료다.
- final_importance_score와 최종 decision이 논리적으로 일치해야 한다.

────────────────────────
[Hard Rules]

1. 최종 core_slots는 반드시 3~6개다.

2. 최종 core는 문단의 주요 의미 축을 모두 보존해야 한다.
   - 점수 상위 slot만 남기지 않는다.
   - 의미 축별 최소 1개 이상의 core slot을 남긴다.
   - 대립/양면 구조에서 한쪽 축 전체를 optional로 보내면 안 된다.

  2-1. 의미 축 완전성 규칙 (강화)
    - 문단의 각 의미 축은 최소 2개의 slot으로 구성되어야 한다.
    - (예: 원인 + 결과, 또는 전환 + 결과)
    - 하나의 축이 1개의 slot만 남는 경우,
    - 관련 slot을 optional에서 core로 복원한다.

  2-2. 목적 축 보존 규칙
    - 단 첫머리의 도입 정보라도, 뒤따르는 핵심 관계들의 목적·문제의식·해결 방향을 규정하면 core로 유지한다.
    - 특히 다음 형태는 단순 배경이 아니라 목적 축으로 본다.
     ~하기 위해
     ~하고자
     ~문제를 해결하기 위해
     ~목적으로
     ~을 가능하게 하기 위해
    - 이 목적 축이 뒤의 수단/효과 slot 전체를 묶는 경우, final_importance_score가 0.35 이상이면 core로 유지한다.

3. 결론/평가 슬롯은 중요하게 본다.
   - 문단의 결론, 평가, 최종 귀결을 담은 slot은 final_importance_score가 0.45 이상이면 core로 유지한다.
   - 결론 slot을 optional로 보내려면, 동일 의미가 다른 core slot에 명확히 병합되어 있어야 한다.
  3-1. 결과/효과 축 보호 규칙
    - 어떤 원인 slot이 core로 유지되면,
    - 그 원인의 직접적인 결과 slot도 함께 core로 유지해야 한다.

(예: A → B 가 core이면, B → C도 core 유지 고려)


4. 중간 전환/메커니즘 슬롯은 중요하게 본다.
   - 원인 → 결과 사이의 중간 사고 단계가 빠지면 relation_loss와 flow_loss를 높게 반영한다.
   - 다른 slot으로 결과를 추론할 수 있더라도, 원문에 명시된 독해 단계라면 손실로 본다.

5. 중복 슬롯은 삭제하지 말고 우선 병합한다.
   - 의미가 겹치는 slot은 더 정확한 표현으로 병합한다.
   - 병합된 slot은 source_merged_slot_ids에 원래 slot id들을 모두 기록한다.

6. 배경/기원/예시/단순 정의는 기본적으로 optional_slots로 보낸다.
   - 단, 해당 정보가 후속 핵심 관계의 필수 전제라면 core로 유지할 수 있다.

7. core_slots는 사고 흐름 순서로 정렬한다.
   - 원인 slot은 결과 slot보다 앞에 둔다.
   - 결론/평가 slot은 관련 원인과 메커니즘 뒤에 둔다.

8. 각 core slot은 하나의 관계만 포함한다.
   - 여러 관계가 섞이면 분리하거나 병합 표현을 단순화한다.
   - 인과/변화/영향 관계에는 →를 사용한다.
   - 정의 관계에는 =를 사용한다.

────────────────────────
[최종 slot text 정규화 규칙 — 매우 중요]

final core_slots와 optional_slots의 text는 반드시 도식형 관계 표현이어야 한다.

final prune 단계는 slot을 새 설명문으로 재작성하는 단계가 아니다.
merged_slots의 표현을 최대한 유지하되, 중복 제거·용어 통일·짧은 압축만 허용한다.

금지:
- 원문 문장을 자연어로 다시 쓰기
- “~하면서”, “~되었고”, “~라고 보며”, “~하였다” 같은 설명문 형태
- 긴 절이나 완전한 문장
- evidence_quote의 문장 구조를 따라 쓰기
- slot 안에 둘 이상의 관계를 넣기

허용:
- 관계 중심 명사구
- A → B
- A = B
- A/B → C
- 짧은 병렬 표현

표현 기준:
- core slot text는 가능하면 15~35자 내외로 압축한다.
- 인과/변화/영향/전환 관계는 →를 사용한다.
- 정의 관계는 =를 사용한다.
- 주어와 수식어는 최소화한다.
- “비평가들은 … 인식했다”처럼 문장형으로 쓰지 말고, “A → 비판적 인식”처럼 쓴다.
- 결론/평가 slot도 문장형이 아니라 평가 관계로 쓴다.

예시:

나쁜 예:
태그의 표현 방식이 기존 태그 위에 덧대거나 복잡하고 화려하게 변형되면서 글자가 읽는 대상에서 보는 대상으로 전환되었다.

좋은 예:
태그 복잡/화려화 → 글자의 시각 대상화

나쁜 예:
비평가들은 예술이 개인의 사유를 담아야 한다고 보며, 단순히 이름이나 별명을 적는 그라피티를 비판적으로 인식했다.

좋은 예:
이름/별명 표기 중심 → 비판적 인식

더 좋은 예:
개인 사유 부족 → 비판적 인식

나쁜 예:
비평가들의 비판적 인식으로 인해 그라피티는 '비가시적이고 텅 비었다'는 평가를 받았다.

좋은 예:
비판적 인식 → 비가시성/공허성 평가

최종 출력 전 자기 점검:
- 각 core slot에 화살표가 0개 또는 1개인가?
- 문장형 어미가 제거되었는가?
- text만 봐도 평가 기준으로 사용할 수 있는가?
- evidence_quote와 text가 구분되는가?
- slot이 설명문이 아니라 사고 관계인가?

────────────────────────
[결정 기준]

각 slot의 decision은 다음 중 하나다.

keep:
- 최종 core_slots에 포함한다.
- 문단의 주요 의미 축, 중간 전환, 결론, 핵심 원인/결과에 해당한다.

optional:
- 문단 이해를 보조하지만, 빠져도 핵심 사고 흐름은 유지된다.
- 배경, 예시, 도입, 부가 설명에 해당한다.

delete:
- 중복이 심하거나, 핵심 독해에 거의 기여하지 않는다.
- optional로 둘 필요도 없는 세부 정보다.

merge:
- 다른 slot과 의미가 겹치므로 하나의 core 또는 optional slot으로 합친다.
- prune_notes에는 merge 대상과 이유를 명시한다.

────────────────────────
[입력]

para_id: {{para_id}}

para_text:
{{para_text}}

merged_slots:
{{merged_slots_json}}

ablation_results:
{{ablation_results_json}}

────────────────────────
[출력 형식]

{
  "schema_version": "gold_para_v3_ablation",
  "para_id": "",
  "language": "ko",
  "gold": {
    "core_slots": [
      {
        "slot_id": "C1",
        "text": "",
        "source_merged_slot_ids": [""],
        "source_text_used": "",
        "final_importance_score": 0.0,
        "evidence_quote": ""
      }
    ],
    "optional_slots": [
      {
        "slot_id": "O1",
        "text": "",
        "source_merged_slot_ids": [""],
        "evidence_quote": ""
      }
    ]
  },
  "prune_notes": [
    {
      "slot_id": "",
      "decision": "keep|optional|delete|merge",
      "final_importance_score": 0.0,
      "role_bonus_applied": 0.0,
      "reason": ""
    }
  ]
}