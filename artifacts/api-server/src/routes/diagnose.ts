import fs from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter } from "express";
import manifest from "../../data/paragraphs/manifest.json" with { type: "json" };
import { runDiagnosis } from "../lib/diagnose";
import { ParagraphManifestItem } from "../lib/types";

const router: IRouter = Router();

router.get("/diagnose/manifest", (req, res) => {
  res.json(manifest);
});

router.post("/diagnose", async (req, res) => {
  try {
    const { passage_id, para_id, student_summary } = req.body as {
      passage_id: string;
      para_id: string;
      student_summary: string;
    };

    const selected = (manifest as ParagraphManifestItem[]).find(
      (item) => item.passage_id === passage_id && item.para_id === para_id
    );

    if (!selected || !student_summary?.trim()) {
      res.status(400).json({ error: "문단 선택과 요약 입력이 필요합니다." });
      return;
    }

    const dataRoot = path.resolve(import.meta.dirname, "..", "..", "data");
    const goldPath = path.join(dataRoot, selected.gold_path);
    const importancePath = path.join(dataRoot, selected.importance_path);
    const [goldRaw, importanceRaw] = await Promise.all([
      fs.readFile(goldPath, "utf-8"),
      fs.readFile(importancePath, "utf-8")
    ]);

    const result = await runDiagnosis({
      paragraph_text: selected.paragraph_text,
      student_summary,
      gold_json: JSON.parse(goldRaw),
      core_importance_json: JSON.parse(importanceRaw)
    });

    res.json({ paragraph: selected, ...result });
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
