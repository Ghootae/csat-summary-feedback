export type Paragraph = {
  para_id: string;
  text: string;
};

export type Passage = {
  passage_id: string;
  title: string;
  paragraphs: Paragraph[];
};

export type SlotResult = {
  slot_id: string;
  status: "PASS" | "MISS" | string;
  diagnostic_note?: string;
  gold_text?: string;
  evidence_spans?: string[];
};

export type InfoUnit = {
  unit_id: string;
  text: string;
  label: "CORE_CONFIRMED" | "CORE_ATTEMPT" | "OPTIONAL" | "EXTRA" | "REDUNDANT" | "UNCLEAR" | string;
  matched_core_slots?: string[];
  matched_optional_slots?: string[];
  reason?: string;
};

export type DiagnoseResult = {
  passage_id: string;
  para_id: string;
  final_decision: "PASS" | "NEEDS_REPAIR" | "NEEDS_COMPRESSION" | "FORM_INVALID" | string;
  core_diagnosis: {
    slot_results?: SlotResult[];
    missing_slots?: string[];
    target_slot?: string;
    [key: string]: unknown;
  };
  compression_assessment: {
    compression_status?: string;
    info_units?: InfoUnit[];
    compression_metrics?: {
      non_core_ratio?: number;
      weighted_non_core_ratio?: number;
      core_confirmed_density?: number;
    };
    [key: string]: unknown;
  };
};
