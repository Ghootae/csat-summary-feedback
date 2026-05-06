"use client";

import { useEffect, useMemo, useState } from "react";
import { buildStatusCards } from "@/lib/panel-helpers";
import { DiagnoseApiResponse, ParagraphManifestItem, Phase } from "@/lib/types";

type Props = { items: ParagraphManifestItem[] };

export default function DiagnoseForm({ items }: Props) {
  const [selectedKey, setSelectedKey] = useState(`${items[0]?.passage_id}::${items[0]?.para_id}`);
  const [responses, setResponses] = useState<string[]>(["", "", ""]);
  const [result, setResult] = useState<DiagnoseApiResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>("INPUT_V0");

  const selected = items.find((x) => `${x.passage_id}::${x.para_id}` === selectedKey);
  const cards = useMemo(() => (result ? buildStatusCards(result) : []), [result]);

  useEffect(() => {
    setResult(null);
    setError("");
    setPhase("INPUT_V0");
  }, [selectedKey]);

  function addResponseInput() {
    setResponses((prev) => [...prev, ""]);
  }

  function updateResponse(index: number, value: string) {
    setResponses((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  async function onSubmit() {
    const compact = responses.map((x) => x.trim()).filter(Boolean);
    if (compact.length === 0) {
      setError("최소 1개 이상의 응답을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage_id: selected?.passage_id ?? "",
          para_id: selected?.para_id ?? "",
          student_summary: compact.join(" / ")
        })
      });
      const json = (await res.json()) as DiagnoseApiResponse;
      if (!res.ok) {
        throw new Error(json.error || "진단 실패");
      }
      setResult(json);
      setPhase("DIAGNOSED");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1440px] p-6">
      <h1 className="mb-4 text-2xl font-bold">CSAT Summary Diagnose MVP</h1>
      <div className="mb-4">
        <select className="w-full rounded border p-2" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
          {items.map((it) => (
            <option key={`${it.passage_id}-${it.para_id}`} value={`${it.passage_id}::${it.para_id}`}>
              {it.title}
            </option>
          ))}
        </select>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <aside className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">문단 내용</h2>
          <p className="text-sm leading-6 text-slate-700">{selected?.paragraph_text}</p>
        </aside>

        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">학생 응답 입력</h2>
          <div className="space-y-2">
            {responses.map((value, index) => (
              <input
                key={`response-${index}`}
                className="w-full rounded border p-2"
                placeholder={`응답 ${index + 1}`}
                value={value}
                onChange={(e) => updateResponse(index, e.target.value)}
              />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="rounded border border-slate-300 px-3 py-2" onClick={addResponseInput} type="button">
              +
            </button>
            <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={loading} onClick={onSubmit} type="button">
              {loading ? "진단 중..." : "제출"}
            </button>
          </div>
          {phase === "DIAGNOSED" && (
            <button
              className="mt-3 rounded bg-slate-900 px-4 py-2 text-white"
              onClick={() => setPhase("REPAIR_PLAN")}
              type="button"
            >
              수정 시작
            </button>
          )}
          {phase === "REPAIR_PLAN" && <p className="mt-3 text-sm text-slate-600">REPAIR_PLAN placeholder: 다음 단계 UI를 준비 중입니다.</p>}
          {error && <div className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</div>}
        </section>

        <aside className="rounded border bg-white p-4">
          <h2 className="mb-2 font-semibold">평가 상태 패널</h2>
          {phase === "INPUT_V0" && <div className="rounded border border-dashed p-4 text-sm text-slate-500">제출 전입니다. 진단 결과 카드가 여기에 표시됩니다.</div>}
          {phase !== "INPUT_V0" && (
            <div className="space-y-2">
              <div className="rounded border bg-slate-50 p-2 text-sm">최종 상태: <b>{result?.final_status}</b></div>
              {cards.map((card) => (
                <div key={card.id} className={`rounded p-3 text-sm ${card.colorClass}`}>
                  <div className="font-semibold">{card.id}</div>
                  <div>{card.text}</div>
                </div>
              ))}
              {cards.length === 0 && <div className="rounded border border-dashed p-3 text-sm text-slate-500">표시할 카드가 없습니다.</div>}
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}
