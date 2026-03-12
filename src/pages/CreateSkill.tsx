import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAppContext } from "../infrastructure/context";
import { Toast } from "../components/Toast";
import { PixelCat } from "../components/PixelCat";

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function CreateSkill() {
  const { installSkill } = useAppContext();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const isNameValid = name.length === 0 || KEBAB_CASE_PATTERN.test(name);
  const canSubmit = name.length > 0 && content.trim().length > 0 && isNameValid && !isProcessing;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const result = await installSkill.execute({ name, content });

      if (result.installed) {
        navigate(`/detail/${name}`);
      } else if (result.alreadyExists) {
        setErrorMessage(result.message);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to install skill");
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Create Skill</h1>
          <p>Manually write a new SKILL.md file</p>
        </div>
      </div>

      {errorMessage && (
        <Toast message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      {isProcessing ? (
        <PixelCat text="Installing skill..." />
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="card">
            <div className="form-group">
              <label htmlFor="skill-name" className="form-label">Skill Name</label>
              <input
                id="skill-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-awesome-skill"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                required
              />
              <p className="form-hint">
                {name && !isNameValid ? (
                  <span style={{ color: "var(--accent-red)" }}>
                    ✗ Must be kebab-case: lowercase letters, numbers, and hyphens only
                  </span>
                ) : (
                  "Use kebab-case: lowercase letters, numbers, and hyphens (e.g. my-skill-v2)"
                )}
              </p>
            </div>

            <div className="form-group">
              <label htmlFor="skill-content" className="form-label">SKILL.md Content</label>
              <textarea
                id="skill-content"
                className="form-textarea code-editor"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={18}
                placeholder={"---\nname: my-awesome-skill\ndescription: What this skill does...\n---\n\n### Claude Project Instruction: My Skill\n\n**Role:**\nYou are an expert in..."}
                required
              />
            </div>

            <button type="submit" className="btn btn-accent" disabled={!canSubmit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17,21 17,13 7,13 7,21" />
                <polyline points="7,3 7,8 15,8" />
              </svg>
              Install Skill
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
