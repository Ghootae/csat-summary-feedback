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
  [key: string]: unknown;
};
