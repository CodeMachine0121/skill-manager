import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { PixelCat } from "../components/PixelCat";
import { Toast } from "../components/Toast";
import type { MarketplaceListingSummary } from "../domain/marketplace-listing";
import { useAppContext } from "../infrastructure/context";

export function MarketplaceBrowser() {
  const navigate = useNavigate();
  const { browseMarketplace } = useAppContext();
  const [listings, setListings] = useState<MarketplaceListingSummary[]>([]);
  const [shareLink, setShareLink] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void loadMarketplace();
  }, []);

  async function loadMarketplace() {
    setIsLoading(true);
    const result = await browseMarketplace.browse();

    if (result.success) {
      setListings(result.listings);
      setErrorMessage(null);
    } else {
      setListings([]);
      setErrorMessage(result.message);
    }

    setIsLoading(false);
  }

  async function handleOpenSharedLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!shareLink.trim()) {
      return;
    }

    const result = await browseMarketplace.openListing({ shareLink });

    if (result.success && result.listing) {
      navigate(`/marketplace/listings/${result.listing.skillName}`);
      return;
    }

    setErrorMessage(result.message);
  }

  return (
    <div>
      {errorMessage && (
        <Toast message={errorMessage} type="error" onClose={() => setErrorMessage(null)} />
      )}

      <div className="page-header">
        <div>
          <h1>Community Marketplace</h1>
          <p>Browse published skills, paste share links, and install community releases.</p>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-ghost" onClick={() => void loadMarketplace()}>
            Refresh
          </button>
          <Link to="/marketplace/publish" className="btn btn-accent">
            Publish Skill
          </Link>
        </div>
      </div>

      <div className="card marketplace-link-panel">
        <form onSubmit={handleOpenSharedLink} className="marketplace-link-form">
          <div className="form-group marketplace-link-field">
            <label htmlFor="share-link" className="form-label">Open a shared marketplace link</label>
            <input
              id="share-link"
              type="text"
              className="form-input"
              value={shareLink}
              onChange={(event) => setShareLink(event.target.value)}
              placeholder="skill-manager://marketplace/release-notes-writer"
            />
            <p className="form-hint">Paste a marketplace link to jump straight to the published listing.</p>
          </div>
          <button className="btn btn-gradient" type="submit" disabled={!shareLink.trim()}>
            Open Link
          </button>
        </form>
      </div>

      {isLoading ? (
        <PixelCat text="Loading marketplace listings..." />
      ) : listings.length === 0 ? (
        <div className="empty-state marketplace-empty-state">
          <h3>No marketplace listings yet</h3>
          <p>Be the first publisher and share one of your local skills with the community.</p>
          <div className="empty-state-actions">
            <Link to="/marketplace/publish" className="btn btn-accent">Publish Skill</Link>
            <Link to="/skills" className="btn btn-ghost">Browse Local Skills</Link>
          </div>
        </div>
      ) : (
        <div className="marketplace-grid">
          {listings.map((listing) => (
            <article key={listing.skillName} className="card marketplace-card">
              <div className="marketplace-card-header">
                <div>
                  <h2>{listing.skillName}</h2>
                  <p>{listing.summary}</p>
                </div>
                <span className="badge badge-info">v{listing.latestVersion}</span>
              </div>
              <div className="tag-list">
                {listing.tags.map((tag) => (
                  <span key={tag} className="tag-chip">#{tag}</span>
                ))}
              </div>
              <p className="marketplace-meta">Published by @{listing.publisherId}</p>
              <div className="marketplace-card-actions">
                <Link to={`/marketplace/listings/${listing.skillName}`} className="btn btn-accent">
                  View Listing
                </Link>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    void navigator.clipboard.writeText(listing.shareLink);
                  }}
                >
                  Copy Link
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
