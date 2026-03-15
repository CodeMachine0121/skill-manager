import { useEffect, useState } from "react";
import { Link } from "react-router";
import { SkillIcon } from "../components/SkillIcon";
import { Toast } from "../components/Toast";
import { useAppContext } from "../infrastructure/context";

interface SkillCardViewModel {
  name: string;
  listingId: string;
  marketplaceVersion: string;
}

export function SkillList() {
  const { manageSkill } = useAppContext();
  const [skills, setSkills] = useState<SkillCardViewModel[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadSkills();
  }, []);

  async function loadSkills() {
    try {
      const summaries = await manageSkill.listSummaries();
      setSkills(
        summaries
          .map((summary) => ({
            name: summary.name.value,
            listingId: summary.metadata.marketplace?.listingId ?? "",
            marketplaceVersion: summary.metadata.marketplace?.version ?? "",
          }))
          .sort((left, right) => left.name.localeCompare(right.name)),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to load skills");
    }
  }

  return (
    <div>
      {successMessage && (
        <Toast message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
      )}
      {loadError && (
        <Toast message={loadError} type="error" onClose={() => setLoadError(null)} />
      )}

      <div className="page-header">
        <div>
          <h1>Installed Skills</h1>
          <p>Manage your Claude Code skills and imported marketplace copies</p>
        </div>
        <div className="page-header-actions">
          <Link to="/marketplace" className="btn btn-ghost">
            Browse Marketplace
          </Link>
          <Link to="/create" className="btn btn-accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create
          </Link>
          <Link to="/generate" className="btn btn-gradient">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
              <path d="M17.8 11.8 20 14" /><path d="M15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
              <path d="M17.8 6.2 20 4" /><path d="m3 21 9-9" /><path d="M12.2 6.2 10 4" />
            </svg>
            AI Generate
          </Link>
        </div>
      </div>

      {skills.length === 0 && !loadError ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="64" height="64">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </div>
          <h3>No skills installed yet</h3>
          <p>Create your first skill, generate one with AI, or import a community listing.</p>
          <div className="empty-state-actions">
            <Link to="/create" className="btn btn-accent">Create Skill</Link>
            <Link to="/generate" className="btn btn-gradient">AI Generate</Link>
            <Link to="/marketplace" className="btn btn-ghost">Browse Marketplace</Link>
          </div>
        </div>
      ) : (
        <div className="skill-grid">
          {skills.map((skill) => (
            <Link key={skill.name} to={`/detail/${skill.name}`} className="skill-card">
              <div className="skill-card-content">
                <SkillIcon name={skill.name} />
                <div className="skill-card-copy">
                  <span className="skill-card-name">{skill.name}</span>
                  {skill.marketplaceVersion && (
                    <div className="skill-card-meta">
                      <span className="badge badge-info">Marketplace v{skill.marketplaceVersion}</span>
                      <span className="skill-card-subtitle">From {skill.listingId}</span>
                    </div>
                  )}
                </div>
              </div>
              <span className="skill-card-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
