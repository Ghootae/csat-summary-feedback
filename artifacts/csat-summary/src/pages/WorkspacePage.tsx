import { useState, useEffect } from "react";
import { Passage, DiagnoseResult } from "@/types";
import LeftPanel from "@/components/LeftPanel";
import MiddlePanel from "@/components/MiddlePanel";
import RightPanel from "@/components/RightPanel";

type Props = { userId: string; onLogout: () => void };

export default function WorkspacePage({ userId, onLogout }: Props) {
  const [passages, setPassages] = useState<Passage[]>([]);
  const [selectedPassageId, setSelectedPassageId] = useState<string>("");
  const [selectedParaId, setSelectedParaId] = useState<string>("");
  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingPassages, setLoadingPassages] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const selectedPassage = passages.find(p => p.passage_id === selectedPassageId);
  const selectedPara = selectedPassage?.paragraphs.find(p => p.para_id === selectedParaId);

  useEffect(() => {
    fetch("/api/paragraphs")
      .then(r => r.json())
      .then((data: Passage[]) => {
        setPassages(data);
        if (data.length > 0) {
          setSelectedPassageId(data[0].passage_id);
          const firstPara = data[0].paragraphs[0];
          if (firstPara) setSelectedParaId(firstPara.para_id);
        }
        setLoadingPassages(false);
      })
      .catch(() => {
        setError("문단 데이터를 불러올 수 없습니다.");
        setLoadingPassages(false);
      });
  }, []);

  function handleSelectParagraph(passageId: string, paraId: string) {
    setSelectedPassageId(passageId);
    setSelectedParaId(paraId);
    setResult(null);
    setSubmitted(false);
    setError("");
  }

  async function handleSubmit(summaries: string[]) {
    const combined = summaries.filter(s => s.trim()).join("\n");
    if (!combined || !selectedPassageId || !selectedParaId) return;

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage_id: selectedPassageId,
          para_id: selectedParaId,
          student_summary: combined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "진단 실패");
      setResult(json);
      setSubmitted(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleEditStart() {
    setSubmitted(false);
    setResult(null);
    setError("");
  }

  const finalDecisionLabel: Record<string, string> = {
    PASS: "통과",
    NEEDS_REPAIR: "보완 필요",
    NEEDS_COMPRESSION: "압축 필요",
    FORM_INVALID: "형식 오류",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Header */}
      <header style={{
        height: 48,
        background: "#fff",
        borderBottom: "1px solid #e2e6ea",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="8" y="7" width="12" height="14" rx="2" fill="#3b5bdb"/>
            <rect x="10" y="10" width="6" height="1.5" rx="0.75" fill="white"/>
            <rect x="10" y="13" width="6" height="1.5" rx="0.75" fill="white"/>
            <rect x="10" y="16" width="4" height="1.5" rx="0.75" fill="white"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: 1, color: "#1a1d23" }}>COREADER</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: "#6b7280" }}>
          {result && (
            <span style={{
              padding: "3px 10px",
              borderRadius: 20,
              fontWeight: 700,
              fontSize: 12,
              background:
                result.final_decision === "PASS" ? "#d3f9d8" :
                result.final_decision === "NEEDS_REPAIR" ? "#dbe4ff" :
                result.final_decision === "NEEDS_COMPRESSION" ? "#fff3cd" : "#f3f4f6",
              color:
                result.final_decision === "PASS" ? "#2f9e44" :
                result.final_decision === "NEEDS_REPAIR" ? "#3b5bdb" :
                result.final_decision === "NEEDS_COMPRESSION" ? "#b45309" : "#6b7280",
            }}>
              {finalDecisionLabel[result.final_decision] ?? result.final_decision}
            </span>
          )}
          <span style={{ color: "#9ca3af" }}>|</span>
          <span>{userId}</span>
          <button
            onClick={onLogout}
            style={{
              background: "none", border: "1px solid #e2e6ea", borderRadius: 6,
              padding: "3px 10px", fontSize: 12, color: "#6b7280", cursor: "pointer",
            }}
          >나가기</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {loadingPassages ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
            불러오는 중...
          </div>
        ) : (
          <>
            <LeftPanel
              passages={passages}
              selectedPassageId={selectedPassageId}
              selectedParaId={selectedParaId}
              onSelect={handleSelectParagraph}
              paragraphText={selectedPara?.text ?? ""}
            />
            <MiddlePanel
              onSubmit={handleSubmit}
              loading={loading}
              error={error}
              submitted={submitted}
              onEditStart={handleEditStart}
              result={result}
            />
            <RightPanel
              result={result}
              loading={loading}
            />
          </>
        )}
      </div>
    </div>
  );
}
