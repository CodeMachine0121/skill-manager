import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { PixelCat } from "../components/PixelCat";
import { Toast } from "../components/Toast";
import type { MarketplaceListing } from "../domain/marketplace-listing";
import { useAppContext } from "../infrastructure/context";

export function MarketplaceListingDetail() {
  const { skillName } = useParams<{ skillName: string }>();
  const navigate = useNavigate();
  const { browseMarketplace } = useAppContext();

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [latestVersion, setLatestVersion] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [renameTo, setRenameTo] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (skillName) {
      void loadListing(skillName);
    }
  }, [skillName]);

  async function loadListing(listingName: string) {
    setIsLoading(true);
    const result = await browseMarketplace.openListing({ skillName: listingName });

    if (result.success) {
      setListing(result.listing);
      setLatestVersion(result.latestVersion);
      setShareLink(result.shareLink);
      setErrorMessage(null);
    } else {
      setListing(null);
      setLatestVersion("");
      setShareLink("");
      setErrorMessage(result.message);
    }

    setIsLoading(false);
  }

  async function handleInstall() {
    if (!skillName) {
      return;
    }

    setIsInstalling(true);
    const result = await browseMarketplace.importSkill({
      skillName,
      renameTo: renameTo.trim() || undefined,
    });

    if (result.installed) {
      navigate(`/detail/${result.importedSkillName}`);
      return;
    }

    setErrorMessage(result.message);

    if (result.suggestedName) {
      setRenameTo(result.suggestedName);
    }

    setIsInstalling(false);
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

  if (!skillName) {
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

      {isLoading ? (
        <PixelCat text="Loading marketplace listing..." />
      ) : !listing ? (
        <div className="empty-state marketplace-empty-state">
          <h3>Listing unavailable</h3>
          <p>The requested marketplace listing could not be loaded.</p>
          <div className="empty-state-actions">
            <Link to="/marketplace" className="btn btn-accent">Back to Marketplace</Link>
          </div>
        </div>
      ) : (
        <>
          <div className="page-header">
            <div>
              <h1>{listing.skillName}</h1>
              <p>{listing.summary}</p>
            </div>
            <div className="page-header-actions">
              <Link to="/marketplace" className="btn btn-ghost">Back</Link>
              <button className="btn btn-ghost" onClick={() => void handleCopyLink()}>
                Copy Link
              </button>
              <button className="btn btn-accent" onClick={() => void handleInstall()} disabled={isInstalling}>
                {isInstalling ? "Installing..." : "Install Latest"}
              </button>
            </div>
          </div>

          <div className="marketplace-detail-layout">
            <section className="card marketplace-detail-main">
              <div className="marketplace-detail-meta">
                <span className="badge badge-info">Latest v{latestVersion}</span>
                <span className="marketplace-meta">Published by @{listing.publisherId}</span>
              </div>
              <div className="tag-list">
                {listing.tags.map((tag) => (
                  <span key={tag} className="tag-chip">#{tag}</span>
                ))}
              </div>

              <div className="form-group" style={{ marginTop: "1.5rem" }}>
                <label htmlFor="rename-import" className="form-label">Import as another local name (optional)</label>
                <input
                  id="rename-import"
                  type="text"
                  className="form-input"
                  value={renameTo}
                  onChange={(event) => setRenameTo(event.target.value)}
                  placeholder={`${listing.skillName}-community`}
                />
                <p className="form-hint">Use a new kebab-case name to keep both your local copy and the imported marketplace skill.</p>
              </div>

              <div className="marketplace-share-block">
                <span className="marketplace-share-label">Share link</span>
                <code className="marketplace-share-link">{shareLink}</code>
              </div>
            </section>

            <aside className="card marketplace-detail-sidebar">
              <h3>Release history</h3>
              <div className="marketplace-release-list">
                {listing.releases.map((release) => (
                  <div key={`${release.version}-${release.publishedAt}`} className="marketplace-release-item">
                    <div className="marketplace-release-header">
                      <strong>v{release.version}</strong>
                      <span>{new Date(release.publishedAt).toLocaleString()}</span>
                    </div>
                    <p>{release.releaseNotes || "No release notes provided."}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
