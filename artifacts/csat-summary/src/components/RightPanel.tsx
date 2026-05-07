import { DiagnoseResult, SlotResult, InfoUnit } from "@/types";

type Props = {
  result: DiagnoseResult | null;
  loading: boolean;
};

const NON_CORE_LABELS = ["OPTIONAL", "EXTRA", "REDUNDANT", "UNCLEAR"];

function getPrefixChar(label: string): string {
  if (label === "OPTIONAL") return "O";
  if (label === "EXTRA") return "E";
  if (label === "REDUNDANT") return "R";
  if (label === "UNCLEAR") return "U";
  return label[0];
}

function SlotCard({ slot }: { slot: SlotResult }) {
  const isPass = slot.status === "PASS";
  return (
    <div style={{
      border: `1.5px solid ${isPass ? "#8ce99a" : "#74c0fc"}`,
      borderRadius: 10,
      padding: "10px 14px",
      background: isPass ? "#f4fdf5" : "#eff6ff",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: isPass ? "#2f9e44" : "#3b5bdb",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 11, fontWeight: 800,
      }}>
        {isPass ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2"/>
            <path d="M12 8v4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="16" r="1" fill="white"/>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 800,
          color: isPass ? "#2f9e44" : "#3b5bdb",
          marginBottom: 2,
        }}>
          {slot.slot_id}
        </div>
        <div style={{
          fontSize: 12.5, color: isPass ? "#1a3d22" : "#1e3a5f",
          lineHeight: 1.5, wordBreak: "keep-all",
        }}>
          {isPass ? (slot.gold_text || "충족됨") : "수정이 필요합니다"}
        </div>
        {slot.diagnostic_note && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
            {slot.diagnostic_note}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoUnitCard({ unit, index }: { unit: InfoUnit; index: number }) {
  const prefix = getPrefixChar(unit.label);
  const num = index + 1;
  return (
    <div style={{
      border: "1.5px solid #c4b5fd",
      borderRadius: 10,
      padding: "10px 14px",
      background: "#faf5ff",
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
        background: "#7048e8",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: 0,
      }}>
        {prefix}{num}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#7048e8", marginBottom: 2 }}>
          {unit.label}
        </div>
        <div style={{ fontSize: 12.5, color: "#3b0764", lineHeight: 1.5, wordBreak: "keep-all" }}>
          {unit.text}
        </div>
        {unit.reason && (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>{unit.reason}</div>
        )}
      </div>
    </div>
  );
}

export default function RightPanel({ result, loading }: Props) {
  const slotResults = result?.core_diagnosis?.slot_results ?? [];
  const infoUnits = result?.compression_assessment?.info_units ?? [];
  const nonCoreUnits = infoUnits.filter(u => NON_CORE_LABELS.includes(u.label));

  // Group non-core by label for sequential numbering per type
  const groupedNonCore: Record<string, InfoUnit[]> = {};
  for (const u of nonCoreUnits) {
    if (!groupedNonCore[u.label]) groupedNonCore[u.label] = [];
    groupedNonCore[u.label].push(u);
  }

  // Build flat list with per-type index
  const nonCoreWithIndex: { unit: InfoUnit; index: number }[] = [];
  for (const u of nonCoreUnits) {
    const group = groupedNonCore[u.label];
    const index = group.indexOf(u);
    nonCoreWithIndex.push({ unit: u, index });
  }

  const cumulativeSummary = result
    ? slotResults
        .filter(s => s.status === "PASS" && s.gold_text)
        .map(s => s.gold_text)
        .filter(Boolean)
    : [];

  return (
    <div style={{
      width: 300,
      flexShrink: 0,
      background: "#fafbfc",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Panel header */}
      <div style={{
        padding: "14px 16px 12px",
        borderBottom: "1px solid #e2e6ea",
        background: "#fff",
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1d23" }}>핵심 요소 현황</div>
        {result ? (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            녹색: 통과 / 파란색: 보완 필요
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            최초 요약을 제출하면 핵심 요소 현황이 표시됩니다.
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 14px" }}>
        {loading && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 12, padding: "40px 0", color: "#9ca3af",
          }}>
            <div style={{
              width: 32, height: 32, border: "3px solid #e2e6ea",
              borderTopColor: "#3b5bdb", borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }} />
            <div style={{ fontSize: 13 }}>AI 진단 중...</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loading && !result && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 8, padding: "40px 0",
          }}>
            <div style={{ fontSize: 32 }}>📋</div>
            <div style={{ fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
              요약을 제출하면<br/>진단 결과가 표시됩니다
            </div>
          </div>
        )}

        {!loading && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Core slot results */}
            {slotResults.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  코어 슬롯
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {slotResults.map(slot => (
                    <SlotCard key={slot.slot_id} slot={slot} />
                  ))}
                </div>
              </div>
            )}

            {/* Non-core info units */}
            {nonCoreWithIndex.length > 0 && (
              <div style={{ marginTop: slotResults.length > 0 ? 12 : 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  비핵심 정보 단위
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {nonCoreWithIndex.map(({ unit, index }) => (
                    <InfoUnitCard key={`${unit.label}-${index}`} unit={unit} index={index} />
                  ))}
                </div>
              </div>
            )}

            {/* Cumulative summary */}
            {cumulativeSummary.length > 0 && (
              <div style={{
                marginTop: 12,
                background: "#fff",
                border: "1px solid #e2e6ea",
                borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 8 }}>
                  누적 요약 ({cumulativeSummary.length}개)
                </div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {cumulativeSummary.map((s, i) => (
                    <li key={i} style={{ fontSize: 12, color: "#374151", marginBottom: 4, lineHeight: 1.5 }}>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* AI 진단 결과 section */}
            {result.compression_assessment?.compression_status && (
              <div style={{
                marginTop: 8,
                background: "#fff",
                border: "1px solid #e2e6ea",
                borderRadius: 10,
                padding: "12px 14px",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                  AI 진단 결과
                </div>
                <div style={{ fontSize: 12, color: "#374151", display: "flex", gap: 8 }}>
                  <span style={{ color: "#9ca3af" }}>압축성:</span>
                  <span style={{ fontWeight: 700 }}>{result.compression_assessment.compression_status}</span>
                </div>
                {result.compression_assessment.compression_metrics?.weighted_non_core_ratio !== undefined && (
                  <div style={{ fontSize: 12, color: "#374151", display: "flex", gap: 8, marginTop: 4 }}>
                    <span style={{ color: "#9ca3af" }}>비핵심 비율:</span>
                    <span style={{ fontWeight: 700 }}>
                      {(result.compression_assessment.compression_metrics.weighted_non_core_ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
