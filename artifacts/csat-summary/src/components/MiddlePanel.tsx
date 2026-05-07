import { useState, useEffect } from "react";
import { DiagnoseResult } from "@/types";

type Props = {
  onSubmit: (summaries: string[]) => void;
  loading: boolean;
  error: string;
  submitted: boolean;
  onEditStart: () => void;
  result: DiagnoseResult | null;
};

export default function MiddlePanel({ onSubmit, loading, error, submitted, onEditStart, result }: Props) {
  const [inputs, setInputs] = useState<string[]>(["", "", ""]);

  // Reset inputs when navigating to a new paragraph (submitted -> false, result -> null)
  useEffect(() => {
    if (!submitted && !result) {
      setInputs(["", "", ""]);
    }
  }, [submitted, result]);

  function handleChange(i: number, val: string) {
    setInputs(prev => prev.map((v, idx) => idx === i ? val : v));
  }

  function handleAdd() {
    setInputs(prev => [...prev, ""]);
  }

  function handleRemove(i: number) {
    if (inputs.length <= 1) return;
    setInputs(prev => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    const filled = inputs.filter(s => s.trim());
    if (filled.length === 0) return;
    onSubmit(inputs);
  }

  const hasInput = inputs.some(s => s.trim());

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      borderRight: "1px solid #e2e6ea",
      overflow: "hidden",
      background: "#fafbfc",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "14px 20px 12px",
        borderBottom: "1px solid #e2e6ea",
        background: "#fff",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1d23" }}>요약 작성</div>
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
          제시문을 읽고 핵심 내용을 불릿 포인트로 요약하세요.
        </div>
      </div>

      {/* Inputs */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {error && (
          <div style={{
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 12,
            fontSize: 13,
            color: "#92400e",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inputs.map((val, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ color: "#3b5bdb", marginTop: 10, fontSize: 16, flexShrink: 0 }}>•</span>
              <div style={{ flex: 1, position: "relative" }}>
                <input
                  type="text"
                  value={val}
                  onChange={e => handleChange(i, e.target.value)}
                  disabled={submitted}
                  placeholder={i === 0 ? "핵심 내용을 요약하세요" : ""}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAdd();
                    }
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: submitted ? "1px solid transparent" : "1.5px solid #e2e6ea",
                    borderRadius: 0,
                    background: submitted ? "transparent" : "transparent",
                    padding: "8px 28px 8px 4px",
                    fontSize: 14,
                    color: "#1a1d23",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => !submitted && (e.target.style.borderBottomColor = "#3b5bdb")}
                  onBlur={e => (e.target.style.borderBottomColor = "#e2e6ea")}
                />
                {!submitted && inputs.length > 1 && (
                  <button
                    onClick={() => handleRemove(i)}
                    style={{
                      position: "absolute", right: 4, top: 8,
                      background: "none", color: "#d1d5db",
                      fontSize: 14, lineHeight: 1, padding: 2,
                      borderRadius: 4,
                    }}
                    tabIndex={-1}
                  >✕</button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add button */}
        {!submitted && (
          <button
            onClick={handleAdd}
            style={{
              marginTop: 12,
              background: "none",
              border: "1.5px dashed #cbd5e1",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: 6,
              width: "100%",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3b5bdb";
              (e.currentTarget as HTMLButtonElement).style.color = "#3b5bdb";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1";
              (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> 항목 추가
          </button>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        padding: "14px 20px",
        borderTop: "1px solid #e2e6ea",
        background: "#fff",
        flexShrink: 0,
      }}>
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={loading || !hasInput}
            style={{
              width: "100%",
              background: loading || !hasInput ? "#c5cbef" : "#3b5bdb",
              color: "#fff",
              borderRadius: 8,
              padding: "11px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading || !hasInput ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading ? "진단 중..." : "제출하기"}
          </button>
        ) : (
          <button
            onClick={onEditStart}
            style={{
              width: "100%",
              background: "#fff",
              color: "#3b5bdb",
              border: "2px solid #3b5bdb",
              borderRadius: 8,
              padding: "11px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#dbe4ff";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = "#fff";
            }}
          >
            수정 시작
          </button>
        )}
      </div>
    </div>
  );
}
