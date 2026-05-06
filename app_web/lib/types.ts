export type ParagraphManifestItem = {
  passage_id: string;
  para_id: string;
  title: string;
  paragraph_text: string;
  gold_path: string;
  importance_path: string;
};

export type CoreDiagnosisResult = {
  missing_slots?: string[];
  slot_results?: Array<{ slot_id: string; status: string; diagnostic_note?: string; gold_text?: string }>;
  [key: string]: unknown;
};

export type CompressionResult = {
  compression_status?: "COMPACT" | "ACCEPTABLE" | "OVER_DETAILED" | "NOT_SUMMARY" | string;
  metrics?: Record<string, unknown>;
  info_units?: Array<Record<string, unknown>>;
  compression_assessment?: {
    info_units?: Array<Record<string, unknown>>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type DiagnoseApiResponse = {
  final_status?: string;
  error?: string;
  core_diagnosis?: CoreDiagnosisResult;
  compression?: CompressionResult;
};

export type Phase = "INPUT_V0" | "DIAGNOSED" | "REPAIR_PLAN";

export type PanelCard = {
  id: string;
  text: string;
  colorClass: string;
};
