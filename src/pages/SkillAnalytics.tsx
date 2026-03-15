import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PixelCat } from "../components/PixelCat";
import { Toast } from "../components/Toast";
import { ParseSkillTimestamp, type SkillAnalyticsDashboard } from "../domain/skill-analytics";
import { useAppContext } from "../infrastructure/context";

const PERIOD_OPTIONS = [7, 30, 90, 365] as const;

export function SkillAnalytics() {
  const { analyzeSkills } = useAppContext();

  const [periodDays, setPeriodDays] = useState(() => ReadPeriodFromSearch(window.location.search));
  const [searchTerm, setSearchTerm] = useState(() => ReadSearchTermFromSearch(window.location.search));
  const [dashboard, setDashboard] = useState<SkillAnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(() =>
    ReadUnavailableSkillMessage(window.location.search),
  );

  useEffect(() => {
    window.history.replaceState(
      window.history.state,
      "",
      BuildAnalyticsDashboardPath({ periodDays, searchTerm }),
    );
  }, [periodDays, searchTerm]);

  useEffect(() => {
    void loadDashboard();
  }, [periodDays, searchTerm]);

  async function loadDashboard() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextDashboard = await analyzeSkills.loadDashboard({
        periodDays,
        searchTerm,
      });
      setDashboard(nextDashboard);
    } catch (error) {
      setDashboard(null);
      setErrorMessage(error instanceof Error ? error.message : "Analytics data is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleExport() {
    if (!dashboard || dashboard.emptyState) {
      return;
    }

    const report = analyzeSkills.exportDashboard(dashboard);
    DownloadAnalyticsReport({
      report,
      periodDays,
      searchTerm,
      generatedAt: dashboard.generatedAt,
    });
    setSuccessMessage("Local analytics report downloaded.");
  }

  return (
    <div>
      {successMessage && (
        <Toast message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
      )}

      <div className="page-header">
        <div>
          <h1>Analytics Dashboard</h1>
          <p>Review local skill activity, trends, and attention areas without leaving your library.</p>
        </div>
        <div className="page-header-actions">
          <button
            className="btn btn-gradient"
            onClick={handleExport}
            disabled={!dashboard || !!dashboard.emptyState || isLoading}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export View
          </button>
        </div>
      </div>

      <div className="card analytics-filter-card">
        <div className="analytics-filter-grid">
          <div className="form-group analytics-filter-group">
            <label htmlFor="analytics-window" className="form-label">Time window</label>
            <select
              id="analytics-window"
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
          </div>

          <div className="form-group analytics-filter-group">
            <label htmlFor="analytics-search" className="form-label">Search skill names</label>
            <input
              id="analytics-search"
              className="form-input"
              value={searchTerm}
              placeholder="triage"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <PixelCat text="Loading analytics..." />
      ) : errorMessage ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h3>Analytics data is temporarily unavailable</h3>
          <p>We could not load the local skill library right now. Try again in a moment.</p>
          <div className="empty-state-actions">
            <button className="btn btn-accent" onClick={() => void loadDashboard()}>
              Retry
            </button>
          </div>
        </div>
      ) : dashboard?.emptyState ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <h3>{dashboard.emptyState.title}</h3>
          <p>{dashboard.emptyState.description}</p>
          <div className="empty-state-actions">
            <Link to={dashboard.emptyState.primaryActionPath} className="btn btn-accent">
              {dashboard.emptyState.primaryActionLabel}
            </Link>
            <Link to={dashboard.emptyState.secondaryActionPath} className="btn btn-gradient">
              {dashboard.emptyState.secondaryActionLabel}
            </Link>
          </div>
        </div>
      ) : dashboard && dashboard.skills.length === 0 ? (
        <div className="empty-state">
          <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.65" y1="16.65" x2="21" y2="21" />
          </svg>
          <h3>No skills match this view</h3>
          <p>Try a broader search term or a wider time window to see more of your local analytics.</p>
          <div className="empty-state-actions">
            <button className="btn btn-ghost" onClick={() => setSearchTerm("")}>
              Clear Search
            </button>
            <button className="btn btn-accent" onClick={() => setPeriodDays(30)}>
              Reset to 30 Days
            </button>
          </div>
        </div>
      ) : dashboard ? (
        <>
          <div className="analytics-summary-grid">
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Installed skills</span>
              <strong className="analytics-summary-value">{dashboard.summary.installedSkillCount}</strong>
              <span className="analytics-summary-note">Total local skills in the library.</span>
            </article>
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Matching view</span>
              <strong className="analytics-summary-value">{dashboard.summary.filteredSkillCount}</strong>
              <span className="analytics-summary-note">
                Skills matching {dashboard.filter.label.toLowerCase()} and the current search.
              </span>
            </article>
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Recent activity</span>
              <strong className="analytics-summary-value">{dashboard.summary.skillsWithRecentChanges}</strong>
              <span className="analytics-summary-note">Skills with archived changes inside the selected window.</span>
            </article>
            <article className="card analytics-summary-card">
              <span className="analytics-summary-label">Needs attention</span>
              <strong className="analytics-summary-value">{dashboard.summary.skillsNeedingAttention}</strong>
              <span className="analytics-summary-note">Skills flagged as stale or missing key metadata.</span>
            </article>
          </div>

          <section className="card analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h2>Recently updated</h2>
                <p>Quickly spot which skills changed most recently.</p>
              </div>
            </div>
            <div className="analytics-recent-list">
              {dashboard.recentlyUpdatedSkills.map((skill) => (
                <div key={skill.name} className="analytics-recent-item">
                  <div>
                    <strong>{skill.name}</strong>
                    <p>{FormatRelativeTimestamp(skill.timestamp)}</p>
                  </div>
                  <span className="analytics-recent-date">{FormatTimestamp(skill.timestamp)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="analytics-skill-list">
            {dashboard.skills.map((skill) => (
              <Link
                key={skill.name}
                to={BuildAnalyticsDetailPath({
                  skillName: skill.name,
                  periodDays,
                  searchTerm,
                })}
                className="card analytics-skill-card"
              >
                <div className="analytics-skill-header">
                  <div>
                    <h2 className="analytics-skill-title">{skill.name}</h2>
                    <p className="analytics-skill-description">
                      {skill.description ?? "Description missing — this skill is flagged for attention."}
                    </p>
                  </div>
                  <span className="skill-card-arrow analytics-skill-arrow">→</span>
                </div>

                <p className="analytics-skill-excerpt">{skill.currentVersionExcerpt}</p>

                <div className="analytics-metadata-grid">
                  <div className="analytics-metric">
                    <span className="analytics-metric-label">Archived versions</span>
                    <strong className="analytics-metric-value">{skill.totalSavedVersions}</strong>
                  </div>
                  <div className="analytics-metric">
                    <span className="analytics-metric-label">{dashboard.filter.label}</span>
                    <strong className="analytics-metric-value">{skill.changesInPeriod} changes</strong>
                  </div>
                  <div className="analytics-metric">
                    <span className="analytics-metric-label">Last archived change</span>
                    <strong className="analytics-metric-value">
                      {skill.lastUpdatedAt ? FormatTimestamp(skill.lastUpdatedAt) : "No history yet"}
                    </strong>
                  </div>
                </div>

                <div className="analytics-badge-row">
                  {skill.attentionFlags.length > 0 ? (
                    skill.attentionFlags.map((flag) => (
                      <span key={`${skill.name}-${flag.kind}`} className="badge badge-warning">
                        {flag.reason}
                      </span>
                    ))
                  ) : (
                    <span className="badge badge-success">
                      Active in {dashboard.filter.label.toLowerCase()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}

function BuildAnalyticsDashboardPath(input: {
  readonly periodDays: number;
  readonly searchTerm: string;
}): string {
  const searchParams = new URLSearchParams();
  searchParams.set("period", String(input.periodDays));

  if (input.searchTerm.trim()) {
    searchParams.set("search", input.searchTerm.trim());
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

function DownloadAnalyticsReport(input: {
  readonly report: string;
  readonly periodDays: number;
  readonly searchTerm: string;
  readonly generatedAt: string;
}) {
  const exportDate = input.generatedAt.slice(0, 10);
  const searchSuffix = input.searchTerm.trim()
    ? `-${input.searchTerm.trim().replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "")}`
    : "";
  const filename = `skill-analytics-${input.periodDays}d${searchSuffix ? searchSuffix : ""}-${exportDate}.json`;
  const blob = new Blob([input.report], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function ReadPeriodFromSearch(search: string): number {
  const period = Number(new URLSearchParams(search).get("period"));
  return PERIOD_OPTIONS.includes(period as typeof PERIOD_OPTIONS[number]) ? period : 30;
}

function ReadSearchTermFromSearch(search: string): string {
  return new URLSearchParams(search).get("search") ?? "";
}

function ReadUnavailableSkillMessage(search: string): string | null {
  const unavailableSkill = new URLSearchParams(search).get("unavailable");
  return unavailableSkill ? `Skill '${unavailableSkill}' is no longer available.` : null;
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
