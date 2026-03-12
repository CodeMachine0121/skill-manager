import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAppContext } from "../infrastructure/context";
import { Toast } from "../components/Toast";
import { SkillIcon } from "../components/SkillIcon";

export function SkillList() {
  const { manageSkill } = useAppContext();
  const [skillNames, setSkillNames] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSkills();
  }, []);

  async function loadSkills() {
    try {
      const names = await manageSkill.listAll();
      setSkillNames(names.map((n) => n.value).sort());
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
          <p>Manage your Claude Code skills</p>
        </div>
        <div className="page-header-actions">
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

      {skillNames.length === 0 && !loadError ? (
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
          <p>Create your first skill manually or generate one with AI.</p>
          <div className="empty-state-actions">
            <Link to="/create" className="btn btn-accent">Create Skill</Link>
            <Link to="/generate" className="btn btn-gradient">AI Generate</Link>
          </div>
        </div>
      ) : (
        <div className="skill-grid">
          {skillNames.map((name) => (
            <Link key={name} to={`/detail/${name}`} className="skill-card">
              <SkillIcon name={name} />
              <span className="skill-card-name">{name}</span>
              <span className="skill-card-arrow">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
