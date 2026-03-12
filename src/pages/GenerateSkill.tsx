import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useAppContext } from "../infrastructure/context";
import { Toast } from "../components/Toast";
import { PixelCat } from "../components/PixelCat";

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function GenerateSkill() {
  const { generateSkill, installSkill } = useAppContext();
  const navigate = useNavigate();

  const [requirementDescription, setRequirementDescription] = useState("");
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [skillName, setSkillName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const isNameValid = skillName.length === 0 || KEBAB_CASE_PATTERN.test(skillName);

  async function handleGenerate(e: FormEvent) {
    e.preventDefault();
    if (!requirementDescription.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const result = await generateSkill.executeAsync(requirementDescription);
      if (result.success) {
        setGeneratedContent(result.generatedContent);
        setShowResult(true);
      } else {
        setErrorMessage(result.errorMessage || "Failed to generate skill");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to generate skill");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleInstall() {
    if (!skillName || !generatedContent || !isNameValid) return;

    setIsInstalling(true);
    setErrorMessage(null);

    try {
      const result = await installSkill.execute({
        name: skillName,
        content: generatedContent,
        forceOverwrite: true,
      });

      if (result.installed) {
        navigate(`/detail/${skillName}`);
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to install skill");
    } finally {
      setIsInstalling(false);
    }
  }

  function handleRegenerate() {
    setShowResult(false);
    setGeneratedContent(null);
    setSkillName("");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>AI Generate</h1>
          <p>Describe what you need and let AI create a skill for you</p>
        </div>
      </div>

      {errorMessage && (
        <Toast message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      {isGenerating ? (
        <PixelCat text="Generating skill with AI..." />
      ) : !showResult ? (
        <form onSubmit={handleGenerate}>
          <div className="card">
            <div className="step-indicator">
              <span className="step active">① Describe</span>
              <span className="step-divider" />
              <span className="step">② Review</span>
              <span className="step-divider" />
              <span className="step">③ Install</span>
            </div>

            <div className="form-group">
              <label htmlFor="requirement" className="form-label">Requirement Description</label>
              <textarea
                id="requirement"
                className="form-textarea"
                value={requirementDescription}
                onChange={(e) => setRequirementDescription(e.target.value)}
                rows={8}
                placeholder={"Describe the skill you want to create. For example:\n\nA TDD expert skill that guides test-driven development with strict RED-GREEN-REFACTOR cycles, emphasizing minimal implementation and design feedback..."}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-gradient"
              disabled={!requirementDescription.trim()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
                <path d="M17.8 11.8 20 14" /><path d="M15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                <path d="M17.8 6.2 20 4" /><path d="m3 21 9-9" /><path d="M12.2 6.2 10 4" />
              </svg>
              Generate Skill
            </button>
          </div>
        </form>
      ) : (
        <div className="card">
          <div className="step-indicator">
            <span className="step">① Describe</span>
            <span className="step-divider" />
            <span className="step active">② Review</span>
            <span className="step-divider" />
            <span className="step">③ Install</span>
          </div>

          <div className="form-group">
            <label htmlFor="skill-name" className="form-label">Skill Name</label>
            <input
              id="skill-name"
              type="text"
              className="form-input"
              value={skillName}
              onChange={(e) => setSkillName(e.target.value)}
              placeholder="my-generated-skill"
            />
            <p className="form-hint">
              {skillName && !isNameValid ? (
                <span style={{ color: "var(--accent-red)" }}>
                  ✗ Must be kebab-case: lowercase letters, numbers, and hyphens only
                </span>
              ) : (
                "Use kebab-case: lowercase letters, numbers, and hyphens"
              )}
            </p>
          </div>

          <div className="form-group">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <label htmlFor="generated-content" className="form-label" style={{ margin: 0 }}>
                Generated Content
              </label>
              <span className="badge badge-info">Editable</span>
            </div>
            <textarea
              id="generated-content"
              className="form-textarea code-editor"
              value={generatedContent || ""}
              onChange={(e) => setGeneratedContent(e.target.value)}
              rows={18}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              className="btn btn-accent"
              onClick={handleInstall}
              disabled={!skillName || !isNameValid || !generatedContent?.trim() || isInstalling}
            >
              {isInstalling ? "Installing..." : "Install Skill"}
            </button>
            <button className="btn btn-ghost" onClick={handleRegenerate}>
              Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
