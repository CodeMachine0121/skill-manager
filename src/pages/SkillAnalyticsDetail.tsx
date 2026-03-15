import { useEffect, useId, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { PixelCat } from "../components/PixelCat";
import { ParseSkillTimestamp, type SkillAnalyticsDetail as SkillAnalyticsDetailView } from "../domain/skill-analytics";
import type { SkillSnapshot } from "../domain/skill-snapshot";
import { SkillAnalyticsMissingSkillError } from "../application/skill-analytics";
import { useAppContext } from "../infrastructure/context";

const PERIOD_OPTIONS = [7, 30, 90, 365] as const;
const DESCRIPTION_PREVIEW_LENGTH = 180;

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
  diffContainer: {
    width: "100%",
    minWidth: "max(100%, 64rem)",
    tableLayout: "auto",
  },
  stickyHeader: {
    position: "static",
    top: "auto",
    zIndex: "auto",
  },
  line: { padding: "4px 10px", fontSize: "0.85rem" },
  gutter: { padding: "0 10px", minWidth: "40px", fontSize: "0.8rem" },
  contentText: {
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    overflowWrap: "normal",
    wordBreak: "normal",
  },
} as const;

export function SkillAnalyticsDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { analyzeSkills } = useAppContext();
  const descriptionDialogId = useId();
  const descriptionDialogTitleId = useId();
  const descriptionDialogDescriptionId = useId();
  const descriptionModalRef = useRef<HTMLDivElement | null>(null);

  const [periodDays, setPeriodDays] = useState(() => ReadPeriodFromSearch(window.location.search));
  const [searchTerm] = useState(() => ReadSearchTermFromSearch(window.location.search));
  const [detail, setDetail] = useState<SkillAnalyticsDetailView | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SkillSnapshot | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "diff">("preview");
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const shouldUseImmersiveLayout = Boolean(detail?.hasRecentActivity && selectedSnapshot);
  const isDiffView = viewMode === "diff";

  useEffect(() => {
    if (!name) {
      return;
    }

    window.history.replaceState(
      window.history.state,
      "",
      BuildAnalyticsDetailPath({
        skillName: name,
        periodDays,
        searchTerm,
      }),
    );
  }, [name, periodDays, searchTerm]);

  useEffect(() => {
    if (!name) {
      return;
    }

    void loadDetail();
  }, [name, periodDays]);

  useEffect(() => {
    if (!isDescriptionModalOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    descriptionModalRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsDescriptionModalOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDescriptionModalOpen]);

  useEffect(() => {
    document.body.classList.toggle("analytics-detail-diff-mode", shouldUseImmersiveLayout);

    return () => {
      document.body.classList.remove("analytics-detail-diff-mode");
    };
  }, [shouldUseImmersiveLayout]);

  async function loadDetail() {
    if (!name) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setIsDescriptionModalOpen(false);

    try {
      const nextDetail = await analyzeSkills.loadSkillDetail({
        skillName: name,
        periodDays,
      });

      setDetail(nextDetail);
      setSelectedSnapshot(nextDetail.timeline[0] ?? null);
      setViewMode("preview");
    } catch (error) {
      if (error instanceof SkillAnalyticsMissingSkillError) {
        navigate(
          BuildAnalyticsDashboardPath({
            periodDays,
            searchTerm,
            unavailableSkill: name,
          }),
          { replace: true },
        );
        return;
      }

      setDetail(null);
      setSelectedSnapshot(null);
      setErrorMessage(error instanceof Error ? error.message : "Analytics data is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!name) {
    return null;
  }

  const description = detail?.description?.trim() || "Description missing";
  const hasDescription = Boolean(detail?.description?.trim());
  const isDescriptionLong = hasDescription && ShouldOpenDescriptionInModal(description);
  const descriptionPreview = isDescriptionLong ? BuildDescriptionPreview(description) : description;
  const descriptionNote = !hasDescription
    ? "No description is currently saved in the local skill file."
    : isDescriptionLong
      ? "Preview truncated for readability. Open the full description for the complete text."
      : "Current metadata from the local skill file.";

  return (
    <div className={`analytics-detail-page${shouldUseImmersiveLayout ? " analytics-detail-page-diff" : ""}`}>
      <div className="page-header analytics-detail-page-header">
        <div>
          <h1>{name} Analytics</h1>
          <p>Read-only activity detail for the selected local skill.</p>
        </div>
        <div className="page-header-actions">
          <select
            aria-label="Analytics detail window"
            className="form-input analytics-period-select"
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Last {option} days
              </option>
            ))}
          </select>
          <button
            className="btn btn-ghost"
            onClick={() =>
              navigate(
                BuildAnalyticsDashboardPath({
                  periodDays,
                  searchTerm,
                }),
              )
            }
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {isLoading ? (
        <PixelCat text="Loading skill analytics..." />
      ) : errorMessage ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Analytics detail is temporarily unavailable</h3>
          <p>We could not load this skill’s analytics detail right now.</p>
          <div className="empty-state-actions">
            <button className="btn btn-accent" onClick={() => void loadDetail()}>
              Retry
            </button>
            <button
              className="btn btn-ghost"
              onClick={() =>
                navigate(
                  BuildAnalyticsDashboardPath({
                    periodDays,
                    searchTerm,
                  }),
                )
              }
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      ) : detail ? (
        <>
          <div className="analytics-summary-grid analytics-detail-summary-grid">
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Description</span>
              <strong
                className={`analytics-summary-text ${isDescriptionLong ? "analytics-description-preview" : ""}`}
              >
                {descriptionPreview}
              </strong>
              <span className="analytics-summary-note">{descriptionNote}</span>
              {isDescriptionLong ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm analytics-description-trigger"
                  onClick={() => setIsDescriptionModalOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={isDescriptionModalOpen}
                  aria-controls={descriptionDialogId}
                >
                  View full description
                </button>
              ) : null}
            </article>
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">{detail.filter.label}</span>
              <strong className="analytics-summary-value">{detail.timeline.length}</strong>
              <span className="analytics-summary-note">Archived changes visible in the selected period.</span>
            </article>
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Archived versions</span>
              <strong className="analytics-summary-value">{detail.totalSavedVersions}</strong>
              <span className="analytics-summary-note">Historical versions saved to the local timeline.</span>
            </article>
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Latest archived change</span>
              <strong className="analytics-summary-text">
                {detail.latestArchivedChangeAt ? FormatTimestamp(detail.latestArchivedChangeAt) : "No history yet"}
              </strong>
              <span className="analytics-summary-note">
                {detail.latestArchivedChangeAt
                  ? FormatRelativeTimestamp(detail.latestArchivedChangeAt)
                  : "The current version is the only saved copy."}
              </span>
            </article>
          </div>

          {detail.hasRecentActivity ? (
            <div
              className={`history-layout analytics-detail-history-layout${shouldUseImmersiveLayout ? " history-layout-diff" : ""}`}
            >
              <div className="history-timeline">
                <div className="timeline-header">
                  <h3>{detail.timeline.length} change{detail.timeline.length !== 1 ? "s" : ""} in view</h3>
                </div>
                <div className="timeline-list">
                  {detail.timeline.map((snapshot) => (
                    <button
                      key={snapshot.timestamp}
                      className={`timeline-item ${selectedSnapshot?.timestamp === snapshot.timestamp ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSnapshot(snapshot);
                      }}
                    >
                      <div className="timeline-dot" />
                      <div className="timeline-content">
                        <span className="timeline-time">{FormatRelativeTimestamp(snapshot.timestamp)}</span>
                        <span className="timeline-date">{FormatTimestamp(snapshot.timestamp)}</span>
                        <span className="timeline-preview">
                          {snapshot.content.slice(0, 80).replace(/\n/g, " ")}…
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`history-detail${shouldUseImmersiveLayout ? " history-detail-diff" : ""}`}>
                {selectedSnapshot ? (
                  <>
                    <div className="detail-toolbar">
                      <button
                        className={`btn btn-sm ${viewMode === "preview" ? "btn-accent" : "btn-ghost"}`}
                        onClick={() => setViewMode("preview")}
                      >
                        Preview Earlier Version
                      </button>
                      <button
                        className={`btn btn-sm ${viewMode === "diff" ? "btn-accent" : "btn-ghost"}`}
                        onClick={() => setViewMode("diff")}
                      >
                        Compare with Current
                      </button>
                    </div>

                    {isDiffView ? (
                      <div className="analytics-diff-workspace">
                        <div className="analytics-diff-banner">
                          <div>
                            <span className="analytics-diff-banner-label">Comparing archived change</span>
                            <strong className="analytics-diff-banner-title">
                              {FormatTimestamp(selectedSnapshot.timestamp)}
                            </strong>
                          </div>
                          <p>
                            Against the current local version. Scroll inside this workspace to inspect longer lines
                            without losing the timeline.
                          </p>
                        </div>

                        <div className="analytics-diff-scroll">
                          <div className="diff-viewer">
                            <ReactDiffViewer
                              oldValue={selectedSnapshot.content}
                              newValue={detail.currentVersionContent}
                              splitView={true}
                              useDarkTheme={true}
                              compareMethod={DiffMethod.WORDS}
                              styles={diffStyles}
                              leftTitle={`Earlier Version (${FormatTimestamp(selectedSnapshot.timestamp)})`}
                              rightTitle="Current Version"
                            />
                          </div>
                        </div>
                      </div>
                    ) : shouldUseImmersiveLayout ? (
                      <div className="analytics-diff-workspace">
                        <div className="analytics-diff-scroll">
                          <pre className="code-block">{selectedSnapshot.content}</pre>
                        </div>
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
                    <h3>Select a change</h3>
                    <p>Choose an earlier version from the timeline to preview or compare it.</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <section className="card analytics-neutral-panel">
              <div className="analytics-panel-header">
                <div>
                  <h2>No recent activity</h2>
                  <p>This skill has no archived changes in the selected period.</p>
                </div>
              </div>

              <p className="analytics-neutral-copy">
                {detail.latestArchivedChangeAt
                  ? `The last archived change was saved on ${FormatTimestamp(detail.latestArchivedChangeAt)}.`
                  : "There are no archived versions yet, but the current skill is still available for review."}
              </p>

              <div className="analytics-current-version">
                <h3>Latest saved version</h3>
                <pre className="code-block">{detail.currentVersionContent}</pre>
              </div>
            </section>
          )}
        </>
      ) : null}

      {detail && hasDescription && isDescriptionLong && isDescriptionModalOpen ? (
        <div className="modal-overlay" onClick={() => setIsDescriptionModalOpen(false)}>
          <div
            id={descriptionDialogId}
            ref={descriptionModalRef}
            className="modal analytics-description-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={descriptionDialogTitleId}
            aria-describedby={descriptionDialogDescriptionId}
            tabIndex={-1}
            onClick={(event) => event.stopPropagation()}
          >
            <h3 id={descriptionDialogTitleId}>{name} description</h3>
            <p id={descriptionDialogDescriptionId} className="analytics-description-modal-copy">
              {description}
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIsDescriptionModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BuildAnalyticsDashboardPath(input: {
  readonly periodDays: number;
  readonly searchTerm: string;
  readonly unavailableSkill?: string;
}): string {
  const searchParams = new URLSearchParams();
  searchParams.set("period", String(input.periodDays));

  if (input.searchTerm.trim()) {
    searchParams.set("search", input.searchTerm.trim());
  }

  if (input.unavailableSkill) {
    searchParams.set("unavailable", input.unavailableSkill);
  }

  const queryString = searchParams.toString();
  return queryString ? `/analytics?${queryString}` : "/analytics";
}

function BuildAnalyticsDetailPath(input: {
  readonly skillName: string;
  readonly periodDays: number;
  readonly searchTerm: string;
}): string {
  const searchParams = new URLSearchParams();
  searchParams.set("period", String(input.periodDays));

  if (input.searchTerm.trim()) {
    searchParams.set("search", input.searchTerm.trim());
  }

  const queryString = searchParams.toString();
  return queryString
    ? `/analytics/${input.skillName}?${queryString}`
    : `/analytics/${input.skillName}`;
}

function ReadPeriodFromSearch(search: string): number {
  const period = Number(new URLSearchParams(search).get("period"));
  return PERIOD_OPTIONS.includes(period as typeof PERIOD_OPTIONS[number]) ? period : 30;
}

function ReadSearchTermFromSearch(search: string): string {
  return new URLSearchParams(search).get("search") ?? "";
}

function FormatTimestamp(timestamp: string): string {
  const parsedTimestamp = ParseSkillTimestamp(timestamp);
  return parsedTimestamp ? parsedTimestamp.toLocaleString() : timestamp;
}

function FormatRelativeTimestamp(timestamp: string): string {
  const parsedTimestamp = ParseSkillTimestamp(timestamp);

  if (!parsedTimestamp) {
    return timestamp;
  }

  const differenceInMilliseconds = Date.now() - parsedTimestamp.getTime();
  const differenceInMinutes = Math.floor(differenceInMilliseconds / 60000);
  const differenceInHours = Math.floor(differenceInMilliseconds / 3600000);
  const differenceInDays = Math.floor(differenceInMilliseconds / 86400000);

  if (differenceInMinutes < 1) {
    return "just now";
  }

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }

  if (differenceInHours < 24) {
    return `${differenceInHours}h ago`;
  }

  return `${differenceInDays}d ago`;
}

function ShouldOpenDescriptionInModal(description: string): boolean {
  return description.length > DESCRIPTION_PREVIEW_LENGTH;
}

function BuildDescriptionPreview(description: string): string {
  const normalizedDescription = description.replace(/\s+/g, " ").trim();

  if (normalizedDescription.length <= DESCRIPTION_PREVIEW_LENGTH) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, DESCRIPTION_PREVIEW_LENGTH).trimEnd()}…`;
}
