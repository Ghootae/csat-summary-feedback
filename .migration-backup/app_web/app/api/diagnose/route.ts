import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import manifest from "@/data/paragraphs/manifest.json";
import { runDiagnosis } from "@/lib/diagnose";
import { ParagraphManifestItem } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { passage_id, para_id, student_summary } = body as {
      passage_id: string;
      para_id: string;
      student_summary: string;
    };

    const selected = (manifest as ParagraphManifestItem[]).find(
      (item) => item.passage_id === passage_id && item.para_id === para_id
    );

    if (!selected || !student_summary?.trim()) {
      return NextResponse.json({ error: "문단 선택과 요약 입력이 필요합니다." }, { status: 400 });
    }

    const goldPath = path.join(process.cwd(), selected.gold_path);
    const importancePath = path.join(process.cwd(), selected.importance_path);
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

    return NextResponse.json({ paragraph: selected, ...result });
  } catch (error) {
    const message = error instanceof SyntaxError ? "JSON 파싱 실패: 모델 출력 형식이 올바르지 않습니다." : (error as Error).message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
