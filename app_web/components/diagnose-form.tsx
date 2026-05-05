"use client";

import { useState } from "react";
import { ParagraphManifestItem } from "@/lib/types";

type Props = { items: ParagraphManifestItem[] };

export default function DiagnoseForm({ items }: Props) {
  const [selectedKey, setSelectedKey] = useState(`${items[0]?.passage_id}::${items[0]?.para_id}`);
  const [summary, setSummary] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selected = items.find((x) => `${x.passage_id}::${x.para_id}` === selectedKey);

  async function onSubmit() {
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage_id: selected?.passage_id,
          para_id: selected?.para_id,
          student_summary: summary
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "진단 실패");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">CSAT Summary Diagnose MVP</h1>
      <select className="w-full rounded border p-2" value={selectedKey} onChange={(e) => setSelectedKey(e.target.value)}>
        {items.map((it) => <option key={`${it.passage_id}-${it.para_id}`} value={`${it.passage_id}::${it.para_id}`}>{it.title}</option>)}
      </select>
      <p className="rounded bg-white p-3 border text-sm">{selected?.paragraph_text}</p>
      <textarea className="w-full min-h-32 rounded border p-2" placeholder="학생 요약 입력" value={summary} onChange={(e) => setSummary(e.target.value)} />
      <button className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50" disabled={loading} onClick={onSubmit}>{loading ? "진단 중..." : "진단 실행"}</button>
      {error && <div className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</div>}
      {result && (
        <section className="space-y-3">
          <div className="rounded border bg-white p-4"><b>최종 상태:</b> {result.final_status}</div>
          <div className="rounded border bg-white p-4">
            <h2 className="font-semibold mb-2">Core Slot 결과</h2>
            <ul className="list-disc pl-5 text-sm">
              {(result.core_diagnosis?.slot_results || []).map((s: any) => (
                <li key={s.slot_id}>{s.slot_id}: <b>{s.status}</b></li>
              ))}
            </ul>
          </div>
          <div className="rounded border bg-white p-4">
            <h2 className="font-semibold mb-2">Compression Metrics</h2>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(result.compression?.metrics ?? result.compression, null, 2)}</pre>
          </div>
          <div className="rounded border bg-white p-4">
            <h2 className="font-semibold mb-2">Raw JSON Debug</h2>
            <pre className="text-xs overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </section>
      )}
    </main>
  );
}
