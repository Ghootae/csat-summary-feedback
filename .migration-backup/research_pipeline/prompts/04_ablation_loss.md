너는 문단 의미 손실 평가기다.

목표:
특정 슬롯 하나를 제거했을 때, 남은 슬롯 기반 재구성이 원문 문단의 핵심 사고 흐름을 얼마나 잃었는지 평가한다.

핵심 원칙:
- 제거된 slot이 문단 독해 경로의 한 단계라면, 남은 slot으로 결과를 추론할 수 있어도 손실로 본다.
- 원문에 명시된 사고 단계가 빠졌다면, 단순히 “대충 의미가 이어진다”는 이유로 손실을 낮게 주지 않는다.
- 단, removed_slot과 의미상 거의 동일한 remaining_slot이 있으면 중복으로 보고 손실을 낮게 준다.
- 출력은 JSON만 한다.

────────────────────────
[평가 기준]

coverage_loss:
- 제거된 slot 때문에 문단의 핵심 의미가 누락되는 정도
- 0.0 = 의미 손실 없음
- 1.0 = 문단 핵심 의미 축이 크게 사라짐

relation_loss:
- 제거된 slot 때문에 인과/변화/전환/대립/조건 관계가 깨지는 정도
- 0.0 = 관계 손실 없음
- 1.0 = 핵심 관계가 붕괴됨

flow_loss:
- 제거된 slot 때문에 문단 사고 흐름이 비약되는 정도
- 0.0 = 흐름 손실 없음
- 1.0 = 사고 흐름이 크게 끊김

importance_score:
- coverage_loss, relation_loss, flow_loss를 종합한 점수
- 단순 평균이 아니라 문단 내 역할을 반영한다
- 결론/평가/중간 전환/주요 의미 축 slot은 더 높게 평가한다

────────────────────────
[손실 평가 강화 규칙]

1. 중간 전환/메커니즘 slot
- 원인 → 결과 사이의 중간 사고 단계가 빠지면 relation_loss와 flow_loss를 높게 준다.
- 결과가 다른 slot으로 추론 가능하더라도, 원문에 명시된 중간 단계라면 손실로 본다.

2. 결론/평가 slot
- 문단의 결론, 평가, 최종 귀결을 담은 slot이 빠지면 flow_loss를 높게 준다.
- 결론 slot이 사라졌는데도 reconstruction이 결론을 직접 복원하지 못하면 decision은 keep 쪽으로 판단한다.

3. 양면/대립 구조
- 문단이 긍정 흐름과 부정 흐름, 원인과 한계, 주장과 비판처럼 두 축으로 구성되어 있을 경우,
  한쪽 축을 대표하는 slot이 빠지면 coverage_loss와 flow_loss를 높게 준다.
- 문단의 긍정 흐름 또는 부정 흐름 중 하나가 사라지면 decision은 keep으로 판단한다.

4. 원인/근거 slot
- 비판, 평가, 결론의 근거가 되는 slot이 빠지면 relation_loss를 높게 준다.
- 특히 “왜 그런 평가가 나왔는가”를 설명하는 slot은 중요하게 본다.

5. 배경/기원/예시 slot
- 단순 배경, 기원, 예시, 도입 정보는 손실을 낮게 준다.
- 단, 그 정보가 후속 핵심 관계의 필수 전제라면 손실을 중간 이상으로 준다.

6. 중복 slot
- removed_slot과 의미상 거의 같은 remaining_slot이 있으면 손실을 낮게 준다.
- 이 경우 decision은 merge 또는 optional로 판단한다.

────────────────────────
[decision 기준]

keep:
- 제거 시 문단 핵심 의미축, 중간 전환, 결론, 핵심 관계가 손실된다.
- coverage_loss, relation_loss, flow_loss 중 하나라도 0.60 이상이면 우선 keep을 고려한다.
- 결론/평가 slot 또는 중간 전환 slot이면서 relation_loss 또는 flow_loss가 0.50 이상이면 keep을 고려한다.

optional:
- 제거 시 일부 의미는 손실되지만, 핵심 사고 흐름은 유지된다.
- 배경/예시/기원/세부 보충 정보에 해당한다.

delete:
- 제거해도 의미 손실이 거의 없고, optional로 둘 필요도 없다.

merge:
- 다른 remaining_slot과 의미가 중복되어 단독 slot으로 유지할 필요는 없지만,
  의미 자체는 다른 slot에 병합되어야 한다.

────────────────────────
[입력]

para_id: {{para_id}}

para_text:
{{para_text}}

removed_slot:
{{removed_slot_json}}

remaining_slots:
{{remaining_slots_json}}

reconstruction:
{{reconstruction_json}}

────────────────────────
[출력 형식]

{
  "schema_version": "ablation_loss_v1",
  "para_id": "",
  "removed_slot_id": "",
  "lost_meaning": [""],
  "coverage_loss": 0.0,
  "relation_loss": 0.0,
  "flow_loss": 0.0,
  "importance_score": 0.0,
  "decision": "keep|optional|delete|merge",
  "rationale": ""
}