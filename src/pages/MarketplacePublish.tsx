import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { PixelCat } from "../components/PixelCat";
import { Toast } from "../components/Toast";
import type { PublishMarketplaceFlowState } from "../application/publish-marketplace-skill";
import { useAppContext } from "../infrastructure/context";

const EMPTY_FLOW_STATE: PublishMarketplaceFlowState = {
  canPublish: false,
  availableSkillNames: [],
  message: "",
  guidanceActions: [],
};

export function MarketplacePublish() {
  const [searchParams] = useSearchParams();
  const { publishMarketplace } = useAppContext();

  const [flowState, setFlowState] = useState<PublishMarketplaceFlowState>(EMPTY_FLOW_STATE);
  const [skillName, setSkillName] = useState("");
  const [publisherId, setPublisherId] = useState("ava");
  const [summary, setSummary] = useState("");
  const [tagsInput, setTagsInput] = useState("release, docs");
  const [version, setVersion] = useState("1.0.0");
  const [releaseNotes, setReleaseNotes] = useState("Initial marketplace release.");
  const [shareLink, setShareLink] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    void loadFlowState();
  }, []);

  async function loadFlowState() {
    setIsLoading(true);
    const result = await publishMarketplace.getFlowState();
    const requestedSkill = searchParams.get("skill") ?? "";
    const selectedSkill = result.availableSkillNames.includes(requestedSkill)
      ? requestedSkill
      : result.availableSkillNames[0] ?? "";

    setFlowState(result);
    setSkillName(selectedSkill);
    setIsLoading(false);
  }

  async function handlePublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!skillName) {
      return;
    }

    setIsPublishing(true);
    setErrorMessage(null);

    const result = await publishMarketplace.publish({
      skillName,
      summary,
      tags: tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean),
      version,
      releaseNotes,
      publisherId,
    });

    if (result.published) {
      setShareLink(result.shareLink);
      setSuccessMessage(result.message);
      setTimeout(() => setSuccessMessage(null), 3000);
    } else {
      setErrorMessage(result.message);
    }

    setIsPublishing(false);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareLink);
      setSuccessMessage("Marketplace link copied to clipboard.");
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch {
      setErrorMessage("Failed to copy the marketplace link.");
    }
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
          <h1>Publish to Marketplace</h1>
          <p>Package a local skill with community metadata and ship a shareable import link.</p>
        </div>
        <div className="page-header-actions">
          <Link to="/marketplace" className="btn btn-ghost">Browse Marketplace</Link>
        </div>
      </div>

      {isLoading ? (
        <PixelCat text="Checking your local skill library..." />
      ) : !flowState.canPublish ? (
        <div className="empty-state marketplace-empty-state">
          <h3>No local skills ready to publish</h3>
          <p>{flowState.message}</p>
          <div className="empty-state-actions">
            <Link to="/create" className="btn btn-accent">Create Skill</Link>
            <Link to="/generate" className="btn btn-gradient">AI Generate</Link>
          </div>
        </div>
      ) : (
        <div className="marketplace-publish-layout">
          <form className="card" onSubmit={handlePublish}>
            <div className="form-group">
              <label htmlFor="publish-skill-name" className="form-label">Local skill</label>
              <select
                id="publish-skill-name"
                className="form-input"
                value={skillName}
                onChange={(event) => setSkillName(event.target.value)}
              >
                {flowState.availableSkillNames.map((availableSkillName) => (
                  <option key={availableSkillName} value={availableSkillName}>
                    {availableSkillName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="publisher-id" className="form-label">Publisher handle</label>
              <input
                id="publisher-id"
                type="text"
                className="form-input"
                value={publisherId}
                onChange={(event) => setPublisherId(event.target.value)}
                placeholder="ava"
              />
              <p className="form-hint">The same handle must be used to publish future versions of the same listing.</p>
            </div>

            <div className="form-group">
              <label htmlFor="marketplace-summary" className="form-label">Marketplace summary</label>
              <textarea
                id="marketplace-summary"
                className="form-textarea"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                placeholder="Explain what makes this skill useful in the marketplace."
              />
            </div>

            <div className="form-group">
              <label htmlFor="marketplace-tags" className="form-label">Tags</label>
              <input
                id="marketplace-tags"
                type="text"
                className="form-input"
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                placeholder="release, docs, writing"
              />
              <p className="form-hint">Separate tags with commas.</p>
            </div>

            <div className="marketplace-publish-grid">
              <div className="form-group">
                <label htmlFor="marketplace-version" className="form-label">Version</label>
                <input
                  id="marketplace-version"
                  type="text"
                  className="form-input"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                  placeholder="1.0.0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="release-notes" className="form-label">Release notes</label>
                <input
                  id="release-notes"
                  type="text"
                  className="form-input"
                  value={releaseNotes}
                  onChange={(event) => setReleaseNotes(event.target.value)}
                  placeholder="Initial marketplace release."
                />
              </div>
            </div>

            <button type="submit" className="btn btn-accent" disabled={isPublishing}>
              {isPublishing ? "Publishing..." : "Publish to Marketplace"}
            </button>
          </form>

          <aside className="card marketplace-publish-sidebar">
            <h3>Publishing checklist</h3>
            <ul className="marketplace-checklist">
              <li>Choose the local skill you want to share.</li>
              <li>Add a marketplace summary, tags, and version.</li>
              <li>Copy the generated import link after publishing.</li>
              <li>Reuse the same publisher handle for future versions.</li>
            </ul>

            {shareLink && (
              <div className="marketplace-share-block marketplace-share-block-success">
                <span className="marketplace-share-label">Shareable import link</span>
                <code className="marketplace-share-link">{shareLink}</code>
                <div className="marketplace-card-actions">
                  <button className="btn btn-gradient" type="button" onClick={() => void handleCopyLink()}>
                    Copy Link
                  </button>
                  <Link to={`/marketplace/listings/${skillName}`} className="btn btn-ghost">
                    View Listing
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
