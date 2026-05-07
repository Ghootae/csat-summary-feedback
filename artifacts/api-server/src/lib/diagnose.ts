import fs from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { CoreDiagnosisResult, CompressionResult } from "./types";

const ROOT = path.resolve(import.meta.dirname, "..");

function extractJson(raw: string): unknown {
  const cleaned = raw.trim();
  const block = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = block?.[1]?.trim() ?? cleaned;
  return JSON.parse(candidate);
}

async function readPrompt(filename: string): Promise<string> {
  const localPath = path.join(ROOT, "data", "prompts", filename);
  return await fs.readFile(localPath, "utf-8");
}

async function runJsonPrompt(prompt: string, input: Record<string, unknown>): Promise<unknown> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set.");
  }

  const client = new OpenAI({ apiKey });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      { role: "system", content: `${prompt}\n\n반드시 JSON만 출력하세요.` },
      { role: "user", content: JSON.stringify(input, null, 2) }
    ]
  });

  const text = response.output_text;
  return extractJson(text);
}

export async function runDiagnosis(payload: {
  paragraph_text: string;
  student_summary: string;
  gold_json: unknown;
  core_importance_json: unknown;
}) {
  const corePrompt = await readPrompt("08_diagnose_core_slots_from_gold.md");
  const compressionPrompt = await readPrompt("08b_assess_summary_compression.md");

  const core = (await runJsonPrompt(corePrompt, payload)) as CoreDiagnosisResult;
  const compression = (await runJsonPrompt(compressionPrompt, {
    student_summary_original: payload.student_summary,
    gold_json: payload.gold_json,
    core_diagnosis_json: core
  })) as CompressionResult;

  const missingSlots = Array.isArray(core.missing_slots) ? core.missing_slots : [];
  const status = compression.compression_status;

  let final_status = "PASS";
  if (status === "NOT_SUMMARY") {
    final_status = "FORM_INVALID";
  } else if (missingSlots.length > 0) {
    final_status = "NEEDS_REPAIR";
  } else if (status === "OVER_DETAILED") {
    final_status = "NEEDS_COMPRESSION";
  } else if (status === "COMPACT" || status === "ACCEPTABLE") {
    final_status = "PASS";
  }

  return { final_status, core_diagnosis: core, compression };
}
