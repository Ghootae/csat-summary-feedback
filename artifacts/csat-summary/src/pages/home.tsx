import { useState, useEffect } from "react";

type ParagraphManifestItem = {
  passage_id: string;
  para_id: string;
  title: string;
  paragraph_text: string;
  gold_path: string;
  importance_path: string;
};

type SlotResult = {
  slot_id: string;
  status: string;
  diagnostic_note?: string;
  gold_text?: string;
};

type DiagnoseResult = {
  final_status: string;
  core_diagnosis: {
    slot_results?: SlotResult[];
    missing_slots?: string[];
    [key: string]: unknown;
  };
  compression: {
    compression_status?: string;
    metrics?: Record<string, unknown>;
    [key: string]: unknown;
  };
  paragraph?: ParagraphManifestItem;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PASS: { label: "합격 (PASS)", color: "bg-green-100 text-green-800 border-green-300" },
  NEEDS_REPAIR: { label: "핵심 누락 (NEEDS_REPAIR)", color: "bg-red-100 text-red-800 border-red-300" },
  NEEDS_COMPRESSION: { label: "압축 필요 (NEEDS_COMPRESSION)", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  FORM_INVALID: { label: "형식 오류 (FORM_INVALID)", color: "bg-gray-100 text-gray-800 border-gray-300" },
};

const SLOT_STATUS_COLORS: Record<string, string> = {
  PRESENT: "text-green-700 font-semibold",
  MISSING: "text-red-600 font-semibold",
  PARTIAL: "text-yellow-600 font-semibold",
};

export default function HomePage() {
  const [items, setItems] = useState<ParagraphManifestItem[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [summary, setSummary] = useState("");
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingManifest, setLoadingManifest] = useState(true);

  useEffect(() => {
    fetch("/api/diagnose/manifest")
      .then((r) => r.json())
      .then((data: ParagraphManifestItem[]) => {
        setItems(data);
        if (data.length > 0) {
          setSelectedKey(`${data[0].passage_id}::${data[0].para_id}`);
        }
        setLoadingManifest(false);
      })
      .catch(() => {
        setError("문단 목록을 불러올 수 없습니다.");
        setLoadingManifest(false);
      });
  }, []);

  const selected = items.find(
    (x) => `${x.passage_id}::${x.para_id}` === selectedKey
  );

  async function onSubmit() {
    if (!selected) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage_id: selected.passage_id,
          para_id: selected.para_id,
          student_summary: summary,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "진단 실패");
      setResult(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const statusInfo = result ? STATUS_LABELS[result.final_status] ?? { label: result.final_status, color: "bg-slate-100 text-slate-800 border-slate-300" } : null;

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-5">
      <h1 className="text-2xl font-bold text-slate-900">CSAT Summary Diagnose MVP</h1>

      {loadingManifest ? (
        <div className="text-slate-500 text-sm">문단 목록 로딩 중...</div>
      ) : (
        <>
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">문단 선택</label>
            <select
              className="w-full rounded border border-slate-300 p-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedKey}
              onChange={(e) => {
                setSelectedKey(e.target.value);
                setResult(null);
                setError("");
              }}
            >
              {items.map((it) => (
                <option
                  key={`${it.passage_id}-${it.para_id}`}
                  value={`${it.passage_id}::${it.para_id}`}
                >
                  {it.title}
                </option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-800 leading-relaxed">
              {selected.paragraph_text}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">학생 요약 입력</label>
            <textarea
              className="w-full min-h-32 rounded border border-slate-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="학생 요약을 여기에 입력하세요..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </div>

          <button
            className="rounded bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading || !summary.trim()}
            onClick={onSubmit}
          >
            {loading ? "진단 중..." : "진단 실행"}
          </button>

          {error && (
            <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && statusInfo && (
            <section className="space-y-4">
              <div className={`rounded border px-4 py-3 font-semibold text-sm ${statusInfo.color}`}>
                최종 상태: {statusInfo.label}
              </div>

              <div className="rounded border border-slate-200 bg-white p-4">
                <h2 className="font-semibold text-slate-800 mb-3">Core Slot 결과</h2>
                {result.core_diagnosis?.slot_results && result.core_diagnosis.slot_results.length > 0 ? (
                  <ul className="space-y-2">
                    {result.core_diagnosis.slot_results.map((s) => (
                      <li key={s.slot_id} className="text-sm">
                        <span className="text-slate-600">{s.slot_id}: </span>
                        <span className={SLOT_STATUS_COLORS[s.status] ?? ""}>{s.status}</span>
                        {s.diagnostic_note && (
                          <span className="text-slate-500 ml-2">— {s.diagnostic_note}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">슬롯 결과 없음</p>
                )}
              </div>

              <div className="rounded border border-slate-200 bg-white p-4">
                <h2 className="font-semibold text-slate-800 mb-2">Compression Metrics</h2>
                <pre className="text-xs overflow-x-auto text-slate-700 bg-slate-50 rounded p-2">
                  {JSON.stringify(result.compression?.metrics ?? result.compression, null, 2)}
                </pre>
              </div>

              <details className="rounded border border-slate-200 bg-white">
                <summary className="px-4 py-3 font-semibold text-slate-800 cursor-pointer text-sm select-none">
                  Raw JSON Debug
                </summary>
                <div className="p-4 pt-0">
                  <pre className="text-xs overflow-x-auto text-slate-700 bg-slate-50 rounded p-2">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </details>
            </section>
          )}
        </>
      )}
    </main>
  );
}
