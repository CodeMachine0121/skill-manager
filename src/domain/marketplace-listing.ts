import { SkillName } from "./skill-name";

export interface MarketplaceRelease {
  version: string;
  releaseNotes: string;
  content: string;
  publishedAt: string;
}

export interface MarketplaceListing {
  skillName: string;
  summary: string;
  tags: string[];
  publisherId: string;
  releases: MarketplaceRelease[];
}

export interface MarketplaceListingSummary {
  skillName: string;
  summary: string;
  tags: string[];
  latestVersion: string;
  publisherId: string;
  shareLink: string;
}

export interface MarketplacePublishPayload {
  skillName: string;
  summary: string;
  tags: string[];
  publisherId: string;
  version: string;
  releaseNotes?: string;
  content: string;
  publishedAt?: string;
}

export class MarketplaceUnavailableError extends Error {
  constructor(message = "Marketplace actions are temporarily unavailable.") {
    super(message);
    this.name = "MarketplaceUnavailableError";
  }
}

export class MarketplaceOwnershipError extends Error {
  constructor(message = "Only the listing owner can publish a new version.") {
    super(message);
    this.name = "MarketplaceOwnershipError";
  }
}

const MARKETPLACE_SHARE_LINK_PREFIX = "skill-manager://marketplace/";

export function CreateMarketplaceListing(payload: MarketplacePublishPayload): MarketplaceListing {
  const skillName = new SkillName(payload.skillName).value;

  return {
    skillName,
    summary: payload.summary.trim(),
    tags: NormalizeMarketplaceTags(payload.tags),
    publisherId: payload.publisherId.trim(),
    releases: CreateSortedMarketplaceReleases([
      CreateMarketplaceRelease({
        version: payload.version,
        releaseNotes: payload.releaseNotes ?? "",
        content: payload.content,
        publishedAt: payload.publishedAt,
      }),
    ]),
  };
}

export function PublishMarketplaceRelease(
  listing: MarketplaceListing,
  payload: MarketplacePublishPayload,
): MarketplaceListing {
  if (listing.publisherId !== payload.publisherId.trim()) {
    throw new MarketplaceOwnershipError();
  }

  const nextRelease = CreateMarketplaceRelease({
    version: payload.version,
    releaseNotes: payload.releaseNotes ?? "",
    content: payload.content,
    publishedAt: payload.publishedAt,
  });
  const remainingReleases = listing.releases.filter((release) => release.version !== payload.version.trim());

  return {
    ...listing,
    summary: payload.summary.trim(),
    tags: NormalizeMarketplaceTags(payload.tags),
    releases: CreateSortedMarketplaceReleases([nextRelease, ...remainingReleases]),
  };
}

export function CreateMarketplaceListingSummary(listing: MarketplaceListing): MarketplaceListingSummary {
  const latestRelease = GetLatestMarketplaceRelease(listing);

  return {
    skillName: listing.skillName,
    summary: listing.summary,
    tags: listing.tags,
    latestVersion: latestRelease.version,
    publisherId: listing.publisherId,
    shareLink: CreateMarketplaceShareLink(listing.skillName),
  };
}

export function GetLatestMarketplaceRelease(listing: MarketplaceListing): MarketplaceRelease {
  const [latestRelease] = CreateSortedMarketplaceReleases(listing.releases);

  if (!latestRelease) {
    throw new Error(`Marketplace listing '${listing.skillName}' has no releases.`);
  }

  return latestRelease;
}

export function CreateMarketplaceShareLink(skillName: string): string {
  return `${MARKETPLACE_SHARE_LINK_PREFIX}${new SkillName(skillName).value}`;
}

export function ParseMarketplaceShareLink(shareLink: string): string | null {
  const trimmedLink = shareLink.trim();

  if (!trimmedLink) {
    return null;
  }

  const listingName = trimmedLink.startsWith(MARKETPLACE_SHARE_LINK_PREFIX)
    ? trimmedLink.slice(MARKETPLACE_SHARE_LINK_PREFIX.length)
    : trimmedLink;

  try {
    return new SkillName(decodeURIComponent(listingName)).value;
  } catch {
    return null;
  }
}

export function CreateRenamedMarketplaceCopyName(skillName: string, version: string): string {
  const normalizedVersion = version
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
  const suffix = normalizedVersion || "copy";

  return new SkillName(`${new SkillName(skillName).value}-${suffix}`).value;
}

export function NormalizeMarketplaceTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean).map((tag) => tag.toLowerCase()))];
}

export function CreateSortedMarketplaceReleases(releases: MarketplaceRelease[]): MarketplaceRelease[] {
  return [...releases].sort(CompareMarketplaceReleases);
}

export function CompareMarketplaceReleases(left: MarketplaceRelease, right: MarketplaceRelease): number {
  const versionComparison = CompareMarketplaceVersions(right.version, left.version);

  if (versionComparison !== 0) {
    return versionComparison;
  }

  return right.publishedAt.localeCompare(left.publishedAt);
}

export function CompareMarketplaceVersions(left: string, right: string): number {
  const leftParts = CreateMarketplaceVersionParts(left);
  const rightParts = CreateMarketplaceVersionParts(right);
  const longestLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < longestLength; index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;

    if (leftPart !== rightPart) {
      return leftPart - rightPart;
    }
  }

  return 0;
}

export function CreateMarketplaceVersionParts(version: string): number[] {
  return version
    .trim()
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .map((part) => (Number.isNaN(part) ? 0 : part));
}

export function CreateMarketplaceRelease(release: {
  version: string;
  releaseNotes: string;
  content: string;
  publishedAt?: string;
}): MarketplaceRelease {
  return {
    version: release.version.trim(),
    releaseNotes: release.releaseNotes.trim(),
    content: release.content,
    publishedAt: release.publishedAt ?? new Date().toISOString(),
  };
}
