import { useState } from "react";
import { Passage } from "@/types";

type Props = {
  passages: Passage[];
  selectedPassageId: string;
  selectedParaId: string;
  onSelect: (passageId: string, paraId: string) => void;
  paragraphText: string;
};

export default function LeftPanel({ passages, selectedPassageId, selectedParaId, onSelect, paragraphText }: Props) {
  const [openPassageId, setOpenPassageId] = useState<string>(selectedPassageId);

  const selectedPassage = passages.find(p => p.passage_id === selectedPassageId);

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      background: "#fff",
      borderRight: "1px solid #e2e6ea",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Paragraph selector */}
      <div style={{
        borderBottom: "1px solid #e2e6ea",
        overflowY: "auto",
        maxHeight: "40%",
        flexShrink: 0,
      }}>
        {passages.map(passage => (
          <div key={passage.passage_id}>
            {/* Passage header */}
            <button
              onClick={() => setOpenPassageId(openPassageId === passage.passage_id ? "" : passage.passage_id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                background: openPassageId === passage.passage_id ? "#f8f9fa" : "transparent",
                borderBottom: "1px solid #f0f2f5",
                fontSize: 12,
                fontWeight: 700,
                color: "#374151",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                cursor: "pointer",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                {passage.title}
              </span>
              <span style={{ color: "#9ca3af", fontSize: 10 }}>
                {openPassageId === passage.passage_id ? "▲" : "▼"}
              </span>
            </button>
            {/* Paragraph list */}
            {openPassageId === passage.passage_id && passage.paragraphs.map(para => {
              const isSelected = selectedPassageId === passage.passage_id && selectedParaId === para.para_id;
              return (
                <button
                  key={para.para_id}
                  onClick={() => onSelect(passage.passage_id, para.para_id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "7px 14px 7px 24px",
                    background: isSelected ? "#dbe4ff" : "transparent",
                    borderBottom: "1px solid #f0f2f5",
                    fontSize: 12,
                    color: isSelected ? "#3b5bdb" : "#6b7280",
                    fontWeight: isSelected ? 700 : 400,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 20, height: 20, borderRadius: "50%",
                    background: isSelected ? "#3b5bdb" : "#e5e7eb",
                    color: isSelected ? "#fff" : "#6b7280",
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {para.para_id.replace("P", "")}
                  </span>
                  <span style={{
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    maxWidth: 160,
                  }}>
                    {para.text.slice(0, 24)}…
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Paragraph text */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "16px 16px",
      }}>
        {selectedPassage && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#9ca3af", marginBottom: 4 }}>
              {selectedPassage.passage_id.slice(0, 8).toUpperCase()} — {selectedPassage.title}
            </div>
            <div style={{
              fontSize: 11, color: "#6b7280", fontWeight: 600, marginBottom: 8,
              background: "#f8f9fa", borderRadius: 4, padding: "2px 6px", display: "inline-block",
            }}>
              {selectedPassageId.slice(0,8)}_{selectedParaId}
            </div>
          </div>
        )}
        <p style={{
          fontSize: 13.5,
          lineHeight: 2,
          color: "#1a1d23",
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
        }}>
          {paragraphText || <span style={{ color: "#9ca3af" }}>문단을 선택하세요</span>}
        </p>
      </div>
    </div>
  );
}
