export type CoreDiagnosisResult = {
  missing_slots?: string[];
  slot_results?: Array<{
    slot_id: string;
    status: "PASS" | "MISS" | string;
    diagnostic_note?: string;
    gold_text?: string;
    evidence_spans?: string[];
  }>;
  target_slot?: string;
  [key: string]: unknown;
};

export type InfoUnit = {
  unit_id: string;
  text: string;
  label: "CORE_CONFIRMED" | "CORE_ATTEMPT" | "OPTIONAL" | "EXTRA" | "REDUNDANT" | "UNCLEAR" | string;
  matched_core_slots?: string[];
  matched_optional_slots?: string[];
  reason?: string;
};

export type CompressionResult = {
  compression_status?: "COMPACT" | "ACCEPTABLE" | "OVER_DETAILED" | "NOT_SUMMARY" | string;
  info_units?: InfoUnit[];
  compression_metrics?: {
    non_core_ratio?: number;
    weighted_non_core_ratio?: number;
    core_confirmed_density?: number;
  };
  counts?: Record<string, number>;
  [key: string]: unknown;
};
