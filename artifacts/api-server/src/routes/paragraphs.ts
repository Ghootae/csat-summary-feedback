import fs from "node:fs/promises";
import path from "node:path";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

const NORMALIZED_DIR = path.join(process.cwd(), "data", "normalized");

router.get("/paragraphs", async (req, res) => {
  try {
    const files = await fs.readdir(NORMALIZED_DIR);
    const passages: { passage_id: string; title: string; paragraphs: { para_id: string; text: string }[] }[] = [];
    for (const file of files.filter(f => f.endsWith(".json"))) {
      const raw = await fs.readFile(path.join(NORMALIZED_DIR, file), "utf-8");
      const data = JSON.parse(raw);
      passages.push({
        passage_id: data.passage_id,
        title: data.title ?? data.passage_id,
        paragraphs: (data.paragraphs ?? [])
          .filter((p: { para_id: string; text?: string }) => p.para_id !== "P5" || data.paragraphs.length <= 5)
          .map((p: { para_id: string; text?: string }) => ({ para_id: p.para_id, text: p.text ?? "" }))
      });
    }
    res.json(passages);
  } catch (err) {
    req.log.error({ err }, "Failed to load paragraphs");
    res.status(500).json({ error: "문단 데이터 로드 실패" });
  }
});

export default router;
