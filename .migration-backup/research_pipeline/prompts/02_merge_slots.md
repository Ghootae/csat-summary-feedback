너는 GOLD 후보 슬롯 병합기다.

목표:
여러 번 생성된 core slot 후보들을 의미 기준으로 병합한다.

절대 규칙:
- 입력된 후보 slot에 없는 새로운 의미를 추가하지 않는다.
- 의미가 같은 slot은 하나로 병합한다.
- 부분적으로 겹치지만 핵심 관계가 다른 slot은 분리한다.
- 병합된 slot도 반드시 하나의 관계만 포함한다.
- core slot 순서는 원문 사고 흐름 순서로 정렬한다.
- 결과 slot이 원인 slot보다 먼저 나오면 안 된다.
- evidence_quotes는 후보에서 가져온 quote들을 배열로 보존한다.
- 출력은 JSON만 한다.

입력:
para_id: {{para_id}}

para_text:
{{para_text}}

candidate_core_slots:
{{candidate_core_slots_json}}

출력 형식:
{
  "schema_version": "merged_slots_v1",
  "para_id": "",
  "merged_core_slots": [
    {
      "merged_slot_id": "M1",
      "text": "",
      "source_slot_ids": ["run1:C1"],
      "evidence_quotes": [""]
    }
  ],
  "merge_notes": [
    {
      "note": ""
    }
  ]
}
