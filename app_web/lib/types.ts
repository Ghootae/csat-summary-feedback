export type ParagraphManifestItem = {
  passage_id: string;
  para_id: string;
  title: string;
  paragraph_text: string;
  gold_path: string;
  importance_path: string;
};

export type SlotStatus = "PASS" | "MISS" | string;

export type CoreSlotResult = {
  slot_id: string;
  status: SlotStatus;
  diagnostic_note?: string;
  gold_text?: string;
  support_type?: string;
  evidence_spans?: string[];
  [key: string]: unknown;
};

export type CoreDiagnosisResult = {
  missing_slots?: string[];
  slot_results?: CoreSlotResult[];
  [key: string]: unknown;
};

export type InfoUnitCategory = "OPTIONAL" | "EXTRA" | "REDUNDANT" | "UNCLEAR" | string;

export type CompressionInfoUnit = {
  label?: string;
  text?: string;
  unit_text?: string;
  content?: string;
  category?: InfoUnitCategory;
  class?: InfoUnitCategory;
  [key: string]: unknown;
};

export type CompressionResult = {
  compression_status?: "COMPACT" | "ACCEPTABLE" | "OVER_DETAILED" | "NOT_SUMMARY" | string;
  metrics?: Record<string, unknown>;
  info_units?: CompressionInfoUnit[];
  compression_assessment?: {
    info_units?: CompressionInfoUnit[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type DiagnoseApiResponse = {
  final_status?: string;
  error?: string;
  paragraph?: ParagraphManifestItem;
  core_diagnosis?: CoreDiagnosisResult;
  compression?: CompressionResult;
};

export type Phase = "INPUT_V0" | "DIAGNOSED" | "REPAIR_PLAN";

export type PanelCard = {
  id: string;
  text: string;
  colorClass: string;
};
