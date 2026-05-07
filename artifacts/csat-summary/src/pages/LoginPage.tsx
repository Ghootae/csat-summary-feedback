import { useState } from "react";

type Props = { onLogin: (id: string) => void };

export default function LoginPage({ onLogin }: Props) {
  const [userId, setUserId] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = userId.trim();
    if (trimmed) onLogin(trimmed);
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f0f2f5",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "48px 40px",
        width: 380,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0,
      }}>
        {/* Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "#dbe4ff",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="4" y="3" width="12" height="16" rx="2" fill="#3b5bdb" opacity="0.18"/>
            <rect x="6" y="5" width="8" height="2" rx="1" fill="#3b5bdb"/>
            <rect x="6" y="9" width="8" height="2" rx="1" fill="#3b5bdb"/>
            <rect x="6" y="13" width="5" height="2" rx="1" fill="#3b5bdb"/>
            <rect x="8" y="7" width="12" height="14" rx="2" fill="#3b5bdb"/>
            <rect x="10" y="10" width="6" height="1.5" rx="0.75" fill="white"/>
            <rect x="10" y="13" width="6" height="1.5" rx="0.75" fill="white"/>
            <rect x="10" y="16" width="4" height="1.5" rx="0.75" fill="white"/>
          </svg>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: 2, color: "#1a1d23", marginBottom: 6 }}>
          COREADER
        </h1>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 32, textAlign: "center" }}>
          수능 국어 비문학 요약 평가·피드백 시스템
        </p>

        <form onSubmit={handleSubmit} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>User ID</label>
          <input
            type="text"
            placeholder="Enter your student ID"
            value={userId}
            onChange={e => setUserId(e.target.value)}
            style={{
              border: "1.5px solid #e2e6ea",
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              color: "#1a1d23",
              width: "100%",
              outline: "none",
              transition: "border-color 0.15s",
            }}
            onFocus={e => (e.target.style.borderColor = "#3b5bdb")}
            onBlur={e => (e.target.style.borderColor = "#e2e6ea")}
            autoFocus
          />
          <button
            type="submit"
            disabled={!userId.trim()}
            style={{
              background: userId.trim() ? "#3b5bdb" : "#c5cbef",
              color: "#fff",
              borderRadius: 8,
              padding: "12px",
              fontSize: 15,
              fontWeight: 700,
              width: "100%",
              cursor: userId.trim() ? "pointer" : "not-allowed",
              transition: "background 0.15s",
              marginTop: 4,
            }}
          >
            Start Learning
          </button>
        </form>

        <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 20, textAlign: "center" }}>
          Demo: Use any ID. Data persists in browser storage.
        </p>
      </div>
    </div>
  );
}
