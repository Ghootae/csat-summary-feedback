import fs from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter } from "express";
import { runDiagnosis } from "../lib/diagnose";

const router: IRouter = Router();

const DATA_ROOT = process.cwd();
const NORMALIZED_DIR = path.join(DATA_ROOT, "data", "normalized");
const GOLDS_DIR = path.join(DATA_ROOT, "data", "golds");
const IMPORTANCE_DIR = path.join(DATA_ROOT, "data", "core_importance");

router.post("/diagnose", async (req, res) => {
  try {
    const { passage_id, para_id, student_summary } = req.body as {
      passage_id: string;
      para_id: string;
      student_summary: string;
    };

    if (!passage_id || !para_id || !student_summary?.trim()) {
      res.status(400).json({ error: "passage_id, para_id, student_summary가 모두 필요합니다." });
      return;
    }

    // Load paragraph text from normalized data
    const normalizedFile = path.join(NORMALIZED_DIR, `${passage_id}_passage.json`);
    let paragraph_text = "";
    try {
      const normalizedRaw = await fs.readFile(normalizedFile, "utf-8");
      const normalized = JSON.parse(normalizedRaw);
      const para = normalized.paragraphs?.find((p: { para_id: string }) => p.para_id === para_id);
      paragraph_text = para?.text ?? "";
    } catch {
      res.status(404).json({ error: `passage ${passage_id}를 찾을 수 없습니다.` });
      return;
    }

    // Load gold and importance files
    const goldPath = path.join(GOLDS_DIR, passage_id, `${para_id}_gold.json`);
    const importancePath = path.join(IMPORTANCE_DIR, passage_id, `${para_id}_importance.json`);

    let gold_json: unknown;
    let core_importance_json: unknown;
    try {
      const [goldRaw, importanceRaw] = await Promise.all([
        fs.readFile(goldPath, "utf-8"),
        fs.readFile(importancePath, "utf-8"),
      ]);
      gold_json = JSON.parse(goldRaw);
      core_importance_json = JSON.parse(importanceRaw);
    } catch {
      res.status(404).json({ error: `${passage_id}/${para_id}에 대한 진단 데이터가 없습니다. (gold/importance 파일 없음)` });
      return;
    }

    const result = await runDiagnosis({
      paragraph_text,
      student_summary,
      gold_json,
      core_importance_json,
    });

    res.json({ passage_id, para_id, ...result });
  } catch (error) {
    const message =
      error instanceof SyntaxError
        ? "JSON 파싱 실패: 모델 출력 형식이 올바르지 않습니다."
        : (error as Error).message;
    req.log.error({ err: error }, "Diagnosis error");
    res.status(500).json({ error: message });
  }
});

export default router;
