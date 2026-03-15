import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import ReactDiffViewer, { DiffMethod } from "react-diff-viewer-continued";
import { PixelCat } from "../components/PixelCat";
import { Toast } from "../components/Toast";
import type { MarketplaceSkillOrigin } from "../domain/skill-metadata";
import { useAppContext } from "../infrastructure/context";

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

export function SkillDetail() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { manageSkill, generateSkill } = useAppContext();

  const [content, setContent] = useState("");
  const [editContent, setEditContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [marketplaceOrigin, setMarketplaceOrigin] = useState<MarketplaceSkillOrigin | undefined>();
  const [aiEditInstruction, setAiEditInstruction] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showDiffView, setShowDiffView] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (name) {
      void loadSkill(name);
    }
  }, [name]);

  async function loadSkill(skillName: string) {
    try {
      const skill = await manageSkill.getSkill(skillName);
      setContent(skill.content);
      setOriginalContent(skill.content);
      setMarketplaceOrigin(skill.metadata.marketplace);
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
    if (!name) {
      return;
    }

    try {
      await manageSkill.updateSkill(name, editContent);
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
    if (!aiEditInstruction.trim()) {
      return;
    }

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
    if (!name) {
      return;
    }

    try {
      await manageSkill.updateSkill(name, editContent);
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
    if (!name) {
      return;
    }

    try {
      await manageSkill.deleteSkill(name);
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

  async function handleCopyMarketplaceLink() {
    if (!marketplaceOrigin) {
      return;
    }

    try {
      await navigator.clipboard.writeText(marketplaceOrigin.shareLink);
      setSuccessMessage("Marketplace link copied to clipboard.");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch {
      setErrorMessage("Failed to copy marketplace link");
    }
  }

  if (!name) {
    return null;
  }

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
          <p>
            {marketplaceOrigin
              ? `Imported from marketplace listing ${marketplaceOrigin.listingId}`
              : "Skill detail and editor"}
          </p>
        </div>
      </div>

      {marketplaceOrigin && (
        <div className="card marketplace-origin-card">
          <div className="marketplace-origin-header">
            <div>
              <span className="badge badge-info">Marketplace import</span>
              <h3>{marketplaceOrigin.listingId}</h3>
              <p>
                Version {marketplaceOrigin.version} · Published by @{marketplaceOrigin.publisherId}
              </p>
            </div>
            <div className="marketplace-card-actions">
              <button className="btn btn-ghost" onClick={() => void handleCopyMarketplaceLink()}>
                Copy Link
              </button>
              <button
                className="btn btn-accent"
                onClick={() => navigate(`/marketplace/listings/${marketplaceOrigin.listingId}`)}
              >
                View Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {isAiProcessing ? (
        <PixelCat text="AI is refining your skill..." />
      ) : showDiffView ? (
        <div>
          <h3 style={{ marginBottom: "1rem", fontFamily: "var(--font-heading)" }}>
            Changes Preview
          </h3>
          <div className="diff-viewer">
            <ReactDiffViewer
              oldValue={originalContent}
              newValue={editContent}
              splitView={true}
              useDarkTheme={true}
              compareMethod={DiffMethod.WORDS}
              styles={diffStyles}
              leftTitle="Original"
              rightTitle="Modified"
            />
          </div>
          <div className="diff-actions">
            <button className="btn btn-ghost" onClick={rejectDiff}>Reject</button>
            <button className="btn btn-accent" onClick={() => { setShowDiffView(false); setIsEditing(true); }}>
              Edit Further
            </button>
            <button className="btn btn-gradient" onClick={() => void acceptDiffAndSave()}>
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
              onChange={(event) => setEditContent(event.target.value)}
              rows={20}
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn btn-accent" onClick={() => void handleSave()}>
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
              onChange={(event) => setAiEditInstruction(event.target.value)}
              rows={4}
              placeholder="Describe what changes you want AI to make..."
            />
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              className="btn btn-gradient"
              onClick={() => void handleAiEdit()}
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
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate(`/marketplace/publish?skill=${encodeURIComponent(name)}`)}
            >
              Publish
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => void handleCopy()}>
              Copy
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/history/${name}`)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" width="16" height="16">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              History
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
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Delete Skill</h3>
            <p>
              Are you sure you want to delete <strong>{name}</strong>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => void handleDelete()}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
