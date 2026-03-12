import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useAppContext } from "../infrastructure/context";
import { Toast } from "../components/Toast";
import { PixelCat } from "../components/PixelCat";

export function SkillDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { manageSkill, generateSkill } = useAppContext();

  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [aiEditInstruction, setAiEditInstruction] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (name) loadSkill();
  }, [name]);

  async function loadSkill() {
    try {
      const skill = await manageSkill.getSkill(name!);
      setContent(skill.content);
      setOriginalContent(skill.content);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load skill");
    }
  }

  function startEdit() {
    setEditContent(content);
    setIsEditing(true);
    setIsAiEditing(false);
    setShowDiffView(false);
  }

  function startAiEdit() {
    setIsAiEditing(true);
    setIsEditing(false);
    setShowDiffView(false);
    setAiEditInstruction("");
  }

  function cancelEdit() {
    setIsEditing(false);
    setIsAiEditing(false);
    setShowDiffView(false);
    setEditContent("");
    setAiEditInstruction("");
  }

  async function handleSave() {
    try {
      await manageSkill.updateSkill(name!, editContent);
      setContent(editContent);
      setOriginalContent(editContent);
      setIsEditing(false);
      setSuccessMessage("Skill updated successfully.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save");
    }
  }

  async function handleAiEdit() {
    if (!aiEditInstruction.trim()) return;

    setIsAiProcessing(true);
    setErrorMessage(null);

    try {
      const result = await generateSkill.refineAsync(content, aiEditInstruction);
      if (result.success) {
        setOriginalContent(content);
        setEditContent(result.generatedContent);
        setShowDiffView(true);
        setIsAiEditing(false);
      } else {
        setErrorMessage(result.errorMessage || "AI edit failed");
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI edit failed");
    } finally {
      setIsAiProcessing(false);
    }
  }

  async function acceptDiffAndSave() {
    try {
      await manageSkill.updateSkill(name!, editContent);
      setContent(editContent);
      setOriginalContent(editContent);
      setShowDiffView(false);
      setSuccessMessage("AI changes accepted and saved.");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save");
    }
  }

  function rejectDiff() {
    setShowDiffView(false);
    setEditContent("");
  }

  async function handleDelete() {
    try {
      await manageSkill.deleteSkill(name!);
      navigate("/skills");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to delete skill");
      setShowDeleteConfirm(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setSuccessMessage("Copied to clipboard!");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setErrorMessage("Failed to copy to clipboard");
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
          <h1>{name}</h1>
          <p>Skill detail and editor</p>
        </div>
      </div>

      {isAiProcessing ? (
        <PixelCat text="AI is refining your skill..." />
      ) : showDiffView ? (
        <div>
          <h3 style={{ marginBottom: "1rem", fontFamily: "var(--font-heading)" }}>
            Changes Preview
          </h3>
          <div className="diff-viewer">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              <div style={{ padding: "1rem", borderRight: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--accent-red)", marginBottom: "0.5rem", fontWeight: 600 }}>
                  Original
                </div>
                <pre className="code-block" style={{ border: "none", margin: 0 }}>
                  {originalContent}
                </pre>
              </div>
              <div style={{ padding: "1rem" }}>
                <div style={{ fontSize: "0.8rem", color: "var(--accent-green)", marginBottom: "0.5rem", fontWeight: 600 }}>
                  Modified
                </div>
                <pre className="code-block" style={{ border: "none", margin: 0 }}>
                  {editContent}
                </pre>
              </div>
            </div>
          </div>
          <div className="diff-actions">
            <button className="btn btn-ghost" onClick={rejectDiff}>Reject</button>
            <button className="btn btn-accent" onClick={() => { setShowDiffView(false); setIsEditing(true); }}>
              Edit Further
            </button>
            <button className="btn btn-gradient" onClick={acceptDiffAndSave}>
              Accept &amp; Save
            </button>
          </div>
        </div>
      ) : isEditing ? (
        <div className="card">
          <div className="form-group">
            <label htmlFor="edit-content" className="form-label">Edit Content</label>
            <textarea
              id="edit-content"
              className="form-textarea code-editor"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={20}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-accent" onClick={handleSave}>
              Save Changes
            </button>
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : isAiEditing ? (
        <div className="card">
          <div className="form-group">
            <label htmlFor="ai-instruction" className="form-label">AI Edit Instruction</label>
            <textarea
              id="ai-instruction"
              className="form-textarea"
              value={aiEditInstruction}
              onChange={(e) => setAiEditInstruction(e.target.value)}
              rows={4}
              placeholder="Describe what changes you want AI to make..."
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="btn btn-gradient"
              onClick={handleAiEdit}
              disabled={!aiEditInstruction.trim()}
            >
              Apply AI Edit
            </button>
            <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="detail-toolbar">
            <button className="btn btn-accent btn-sm" onClick={startEdit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Edit
            </button>
            <button className="btn btn-gradient btn-sm" onClick={startAiEdit}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
                <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
                <path d="M17.8 11.8 20 14" /><path d="M15 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                <path d="M17.8 6.2 20 4" /><path d="m3 21 9-9" /><path d="M12.2 6.2 10 4" />
              </svg>
              AI Edit
            </button>
            <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
              Copy
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteConfirm(true)}>
              Delete
            </button>
          </div>
          <pre className="code-block">{content}</pre>
        </>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Skill</h3>
            <p>
              Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
