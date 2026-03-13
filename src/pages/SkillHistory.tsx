import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { useAppContext } from "../infrastructure/context";
import { Toast } from "../components/Toast";
import { PixelCat } from "../components/PixelCat";
import type { SkillSnapshot } from "../domain/skill-snapshot";

const diffStyles = {
  variables: {
    dark: {
      diffViewerBackground: "#0F172A",
      gutterBackground: "#1E293B",
      addedBackground: "rgba(16, 185, 129, 0.12)",
      addedGutterBackground: "rgba(16, 185, 129, 0.2)",
      removedBackground: "rgba(239, 68, 68, 0.12)",
      removedGutterBackground: "rgba(239, 68, 68, 0.2)",
      wordAddedBackground: "rgba(16, 185, 129, 0.3)",
      wordRemovedBackground: "rgba(239, 68, 68, 0.3)",
      addedGutterColor: "#34D399",
      removedGutterColor: "#F87171",
      gutterColor: "#64748B",
      codeFoldGutterBackground: "#1E293B",
      codeFoldBackground: "#1E293B",
      emptyLineBackground: "#0F172A",
      diffViewerTitleBackground: "#1E293B",
      diffViewerTitleColor: "#E2E8F0",
      diffViewerTitleBorderColor: "#334155",
    },
  },
  line: { padding: "4px 10px", fontSize: "0.85rem" },
  gutter: { padding: "0 10px", minWidth: "40px", fontSize: "0.8rem" },
  contentText: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: "1.6" },
} as const;

function formatTimestamp(ts: string): string {
  const isoString = ts.replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3");
  const date = new Date(isoString + "Z");
  return date.toLocaleString();
}

function timeAgo(ts: string): string {
  const isoString = ts.replace(/T(\d{2})-(\d{2})-(\d{2})/, "T$1:$2:$3");
  const date = new Date(isoString + "Z");
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export function SkillHistory() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { manageHistory, manageSkill } = useAppContext();

  const [snapshots, setSnapshots] = useState<SkillSnapshot[]>([]);
  const [currentContent, setCurrentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SkillSnapshot | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "diff">("preview");
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (name) loadHistory();
  }, [name]);

  async function loadHistory() {
    setIsLoading(true);
    try {
      const [snapshotList, skill] = await Promise.all([
        manageHistory.listSnapshots(name!),
        manageSkill.getSkill(name!),
      ]);
      setSnapshots(snapshotList);
      setCurrentContent(skill.content);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    if (!selectedSnapshot) return;
    try {
      await manageHistory.restoreSnapshot(name!, selectedSnapshot.timestamp);
      setSuccessMessage("Skill restored to selected version.");
      setShowRestoreConfirm(false);
      setSelectedSnapshot(null);
      await loadHistory();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to restore");
      setShowRestoreConfirm(false);
    }
  }

  if (!name) return null;

  return (
    <div>
      {successMessage && (
        <Toast message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
      )}
      {errorMessage && (
        <Toast message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      <div className="page-header">
        <div>
          <h1>Edit History</h1>
          <p>
            <span
              style={{ cursor: "pointer", color: "var(--accent-blue)" }}
              onClick={() => navigate(`/detail/${name}`)}
            >
              {name}
            </span>
            {" — "}version history (last 7 days)
          </p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => navigate(`/detail/${name}`)}>
            ← Back to Skill
          </button>
        </div>
      </div>

      {isLoading ? (
        <PixelCat text="Loading history..." />
      ) : snapshots.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3>No edit history yet</h3>
          <p>History will be recorded automatically when you edit this skill.</p>
          <div className="empty-state-actions">
            <button className="btn btn-accent" onClick={() => navigate(`/detail/${name}`)}>
              Go to Skill
            </button>
          </div>
        </div>
      ) : (
        <div className="history-layout">
          {/* Timeline */}
          <div className="history-timeline">
            <div className="timeline-header">
              <h3>{snapshots.length} version{snapshots.length !== 1 ? "s" : ""}</h3>
            </div>
            <div className="timeline-list">
              {snapshots.map((snapshot) => (
                <button
                  key={snapshot.timestamp}
                  className={`timeline-item ${selectedSnapshot?.timestamp === snapshot.timestamp ? "active" : ""}`}
                  onClick={() => { setSelectedSnapshot(snapshot); setViewMode("preview"); }}
                >
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <span className="timeline-time">{timeAgo(snapshot.timestamp)}</span>
                    <span className="timeline-date">{formatTimestamp(snapshot.timestamp)}</span>
                    <span className="timeline-preview">
                      {snapshot.content.slice(0, 80).replace(/\n/g, " ")}…
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="history-detail">
            {selectedSnapshot ? (
              <>
                <div className="detail-toolbar">
                  <button
                    className={`btn btn-sm ${viewMode === "preview" ? "btn-accent" : "btn-ghost"}`}
                    onClick={() => setViewMode("preview")}
                  >
                    Preview
                  </button>
                  <button
                    className={`btn btn-sm ${viewMode === "diff" ? "btn-accent" : "btn-ghost"}`}
                    onClick={() => setViewMode("diff")}
                  >
                    Compare with Current
                  </button>
                  <button
                    className="btn btn-gradient btn-sm"
                    onClick={() => setShowRestoreConfirm(true)}
                  >
                    Restore this Version
                  </button>
                </div>

                {viewMode === "diff" ? (
                  <div className="diff-viewer">
                    <ReactDiffViewer
                      oldValue={selectedSnapshot.content}
                      newValue={currentContent}
                      splitView={true}
                      useDarkTheme={true}
                      compareMethod={DiffMethod.WORDS}
                      styles={diffStyles}
                      leftTitle={`Snapshot (${formatTimestamp(selectedSnapshot.timestamp)})`}
                      rightTitle="Current Version"
                    />
                  </div>
                ) : (
                  <pre className="code-block">{selectedSnapshot.content}</pre>
                )}
              </>
            ) : (
              <div className="empty-state" style={{ padding: "3rem 2rem" }}>
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <h3>Select a version</h3>
                <p>Click a version from the timeline to preview or compare it.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restore confirmation modal */}
      {showRestoreConfirm && selectedSnapshot && (
        <div className="modal-overlay" onClick={() => setShowRestoreConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Restore Version</h3>
            <p>
              Restore <strong>{name}</strong> to the version from{" "}
              <strong>{formatTimestamp(selectedSnapshot.timestamp)}</strong>?
              The current version will be saved as a new history entry.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowRestoreConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-gradient" onClick={handleRestore}>
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
