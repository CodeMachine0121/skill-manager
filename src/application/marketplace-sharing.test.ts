import { beforeEach, describe, expect, it } from "bun:test";
import { BrowseMarketplaceUseCase } from "./browse-marketplace";
import { PublishMarketplaceSkillUseCase } from "./publish-marketplace-skill";
import { MarketplaceUnavailableError, type MarketplaceListing } from "../domain/marketplace-listing";
import type { IMarketplaceRepository, ISkillRepository } from "../domain/ports";
import { Skill } from "../domain/skill";
import { SkillName } from "../domain/skill-name";
import type { SkillMetadata } from "../domain/skill-metadata";
import type { SkillSummary } from "../domain/skill-summary";

describe("Skill marketplace sharing", () => {
  let skillRepository: InMemorySkillRepository;
  let marketplaceRepository: InMemoryMarketplaceRepository;
  let browseMarketplace: BrowseMarketplaceUseCase;
  let publishMarketplaceSkill: PublishMarketplaceSkillUseCase;

  beforeEach(() => {
    skillRepository = new InMemorySkillRepository();
    marketplaceRepository = new InMemoryMarketplaceRepository();
    browseMarketplace = new BrowseMarketplaceUseCase(skillRepository, marketplaceRepository);
    publishMarketplaceSkill = new PublishMarketplaceSkillUseCase(skillRepository, marketplaceRepository);
  });

  describe("Publishers can share local skills with the community", () => {
    it("Publish a local skill as a new marketplace listing", async () => {
      await GivenLocalSkillsExist(skillRepository, CreateSkill());

      const result = await publishMarketplaceSkill.publish(CreatePublishRequest());

      expect(result).toMatchObject({
        published: true,
        latestVersion: "1.0.0",
        shareLink: "skill-manager://marketplace/release-notes-writer",
      });

      const browseResult = await browseMarketplace.browse();

      expect(browseResult).toEqual({
        success: true,
        listings: [
          {
            skillName: "release-notes-writer",
            summary: "Writes polished release notes for product launches.",
            tags: ["release", "docs"],
            latestVersion: "1.0.0",
            publisherId: "ava",
            shareLink: "skill-manager://marketplace/release-notes-writer",
          },
        ],
        message: "",
      });
    });

    it("Publish a new version of an existing marketplace listing", async () => {
      await GivenLocalSkillsExist(skillRepository, CreateSkill());
      await publishMarketplaceSkill.publish(CreatePublishRequest());
      await GivenLocalSkillsExist(
        skillRepository,
        CreateSkill({
          content: "# Release Notes Writer v1.1.0\n\nUpdated to cover changelog callouts.",
        }),
      );

      const result = await publishMarketplaceSkill.publish(
        CreatePublishRequest({
          version: "1.1.0",
          releaseNotes: "Adds changelog callout guidance.",
        }),
      );

      expect(result).toMatchObject({
        published: true,
        latestVersion: "1.1.0",
        shareLink: "skill-manager://marketplace/release-notes-writer",
      });

      const importingSkillRepository = new InMemorySkillRepository();
      const marketplaceReader = new BrowseMarketplaceUseCase(
        importingSkillRepository,
        marketplaceRepository,
      );
      const installResult = await marketplaceReader.importSkill({
        skillName: "release-notes-writer",
      });

      expect(installResult).toMatchObject({
        installed: true,
        importedSkillName: "release-notes-writer",
        marketplaceVersion: "1.1.0",
      });

      const importedSkill = await importingSkillRepository.read(new SkillName("release-notes-writer"));

      expect(importedSkill.content).toContain("v1.1.0");
      expect(importedSkill.metadata.marketplace).toEqual({
        listingId: "release-notes-writer",
        version: "1.1.0",
        shareLink: "skill-manager://marketplace/release-notes-writer",
        publisherId: "ava",
      });
    });

    it("Guide a user who has no local skills to share", async () => {
      const result = await publishMarketplaceSkill.getFlowState();

      expect(result).toEqual({
        canPublish: false,
        availableSkillNames: [],
        message: "Create or generate a skill before publishing it to the marketplace.",
        guidanceActions: ["create", "generate"],
      });
    });
  });

  describe("Users can discover and import marketplace skills", () => {
    it("Install a marketplace skill from the browser", async () => {
      await GivenMarketplaceHasListing(
        marketplaceRepository,
        CreateMarketplaceListing({
          releases: [
            CreateMarketplaceRelease({
              version: "1.0.0",
              content: "# Release Notes Writer v1.0.0\n\nOriginal.",
            }),
            CreateMarketplaceRelease({
              version: "1.1.0",
              content: "# Release Notes Writer v1.1.0\n\nLatest browser install.",
            }),
          ],
        }),
      );

      const browseResult = await browseMarketplace.browse();
      const installResult = await browseMarketplace.importSkill({
        skillName: "release-notes-writer",
      });

      expect(browseResult).toMatchObject({
        success: true,
        listings: [
          {
            skillName: "release-notes-writer",
            latestVersion: "1.1.0",
          },
        ],
      });
      expect(installResult).toMatchObject({
        installed: true,
        importedSkillName: "release-notes-writer",
        marketplaceVersion: "1.1.0",
      });

      const installedSkill = await skillRepository.read(new SkillName("release-notes-writer"));

      expect(installedSkill.metadata.marketplace).toEqual({
        listingId: "release-notes-writer",
        version: "1.1.0",
        shareLink: "skill-manager://marketplace/release-notes-writer",
        publisherId: "ava",
      });
    });

    it("Install a marketplace skill from a shared link", async () => {
      await GivenMarketplaceHasListing(marketplaceRepository, CreateMarketplaceListing());

      const listingResult = await browseMarketplace.openListing({
        shareLink: "skill-manager://marketplace/release-notes-writer",
      });
      const installResult = await browseMarketplace.importSkill({
        shareLink: "skill-manager://marketplace/release-notes-writer",
      });

      expect(listingResult).toMatchObject({
        success: true,
        shareLink: "skill-manager://marketplace/release-notes-writer",
        listing: {
          skillName: "release-notes-writer",
        },
      });
      expect(installResult).toMatchObject({
        installed: true,
        importedSkillName: "release-notes-writer",
        listingId: "release-notes-writer",
      });

      const installedSkill = await skillRepository.read(new SkillName("release-notes-writer"));

      expect(installedSkill.metadata.marketplace?.listingId).toBe("release-notes-writer");
    });

    it("Keep both skills when an imported skill name is already taken", async () => {
      await GivenLocalSkillsExist(skillRepository, CreateSkill());
      await GivenMarketplaceHasListing(marketplaceRepository, CreateMarketplaceListing());

      const installResult = await browseMarketplace.importSkill({
        skillName: "release-notes-writer",
        renameTo: "release-notes-writer-community",
      });
      const localLibrary = await skillRepository.listAll();

      expect(installResult).toMatchObject({
        installed: true,
        importedSkillName: "release-notes-writer-community",
      });
      expect(localLibrary.map((skillName) => skillName.value).sort()).toEqual([
        "release-notes-writer",
        "release-notes-writer-community",
      ]);
    });
  });

  describe("Users see predictable marketplace limits and failures", () => {
    it("Stop publishing when required listing details are incomplete", async () => {
      await GivenLocalSkillsExist(skillRepository, CreateSkill());

      const result = await publishMarketplaceSkill.publish(
        CreatePublishRequest({
          summary: "",
          tags: [],
          version: "",
        }),
      );

      expect(result).toEqual({
        published: false,
        shareLink: "",
        latestVersion: "",
        message: "Missing marketplace details: summary, tags, version.",
        missingFields: ["summary", "tags", "version"],
      });
    });

    it("Prevent someone else from publishing over an existing listing", async () => {
      await GivenLocalSkillsExist(skillRepository, CreateSkill());
      await GivenMarketplaceHasListing(marketplaceRepository, CreateMarketplaceListing());

      const result = await publishMarketplaceSkill.publish(
        CreatePublishRequest({
          publisherId: "ben",
          version: "1.1.0",
          releaseNotes: "Ben should not be able to publish this.",
        }),
      );

      expect(result).toEqual({
        published: false,
        shareLink: "",
        latestVersion: "",
        message: "Only the listing owner can publish a new version.",
        missingFields: [],
      });
    });

    it("Tell the user when a marketplace listing is no longer available", async () => {
      const listingResult = await browseMarketplace.openListing({
        shareLink: "skill-manager://marketplace/release-notes-writer",
      });
      const installResult = await browseMarketplace.importSkill({
        shareLink: "skill-manager://marketplace/release-notes-writer",
      });

      expect(listingResult).toEqual({
        success: false,
        listing: null,
        shareLink: "",
        latestVersion: "",
        message: "This marketplace listing is no longer available.",
      });
      expect(installResult).toEqual({
        installed: false,
        alreadyExists: false,
        importedSkillName: "",
        listingId: "",
        marketplaceVersion: "",
        message: "This marketplace listing is no longer available.",
        needsRename: false,
        suggestedName: "",
      });
    });

    it("Tell the user when the marketplace is temporarily unavailable", async () => {
      GivenMarketplaceIsUnavailable(marketplaceRepository);

      const result = await browseMarketplace.browse();

      expect(result).toEqual({
        success: false,
        listings: [],
        message: "Marketplace actions are temporarily unavailable.",
      });
    });
  });
});

interface PublishRequestOverrides {
  skillName?: string;
  summary?: string;
  tags?: string[];
  version?: string;
  releaseNotes?: string;
  publisherId?: string;
}

interface MarketplaceListingOverrides {
  skillName?: string;
  summary?: string;
  tags?: string[];
  publisherId?: string;
  releases?: MarketplaceListing["releases"];
}

interface MarketplaceReleaseOverrides {
  version?: string;
  releaseNotes?: string;
  content?: string;
  publishedAt?: string;
}

interface SkillOverrides {
  name?: string;
  content?: string;
  metadata?: SkillMetadata;
}

function CreatePublishRequest(overrides: PublishRequestOverrides = {}) {
  return {
    skillName: overrides.skillName ?? "release-notes-writer",
    summary: overrides.summary ?? "Writes polished release notes for product launches.",
    tags: overrides.tags ?? ["release", "docs"],
    version: overrides.version ?? "1.0.0",
    releaseNotes: overrides.releaseNotes ?? "Initial marketplace release.",
    publisherId: overrides.publisherId ?? "ava",
  };
}

function CreateMarketplaceListing(overrides: MarketplaceListingOverrides = {}): MarketplaceListing {
  return {
    skillName: overrides.skillName ?? "release-notes-writer",
    summary: overrides.summary ?? "Writes polished release notes for product launches.",
    tags: overrides.tags ?? ["release", "docs"],
    publisherId: overrides.publisherId ?? "ava",
    releases: overrides.releases ?? [CreateMarketplaceRelease()],
  };
}

function CreateMarketplaceRelease(overrides: MarketplaceReleaseOverrides = {}) {
  return {
    version: overrides.version ?? "1.1.0",
    releaseNotes: overrides.releaseNotes ?? "Adds more polished summaries.",
    content:
      overrides.content ??
      "# Release Notes Writer v1.1.0\n\nSummarize releases with a crisp structure and polished tone.",
    publishedAt: overrides.publishedAt ?? "2026-03-15T10:00:00.000Z",
  };
}

function CreateSkill(overrides: SkillOverrides = {}) {
  return new Skill(
    new SkillName(overrides.name ?? "release-notes-writer"),
    overrides.content ??
      "# Release Notes Writer v1.0.0\n\nSummarize releases with a crisp structure and polished tone.",
    overrides.metadata ?? {},
  );
}

async function GivenLocalSkillsExist(
  repository: InMemorySkillRepository,
  ...skills: Skill[]
): Promise<void> {
  for (const skill of skills) {
    await repository.save(skill);
  }
}

async function GivenMarketplaceHasListing(
  repository: InMemoryMarketplaceRepository,
  listing: MarketplaceListing,
): Promise<void> {
  await repository.saveListing(listing);
}

function GivenMarketplaceIsUnavailable(repository: InMemoryMarketplaceRepository): void {
  repository.isAvailable = false;
}

class InMemorySkillRepository implements ISkillRepository {
  readonly skills = new Map<string, Skill>();

  async exists(name: SkillName): Promise<boolean> {
    return this.skills.has(name.value);
  }

  async save(skill: Skill): Promise<void> {
    this.skills.set(skill.name.value, skill);
  }

  async read(name: SkillName): Promise<Skill> {
    const skill = this.skills.get(name.value);

    if (!skill) {
      throw new Error(`Skill '${name.value}' not found.`);
    }

    return skill;
  }

  async listAll(): Promise<SkillName[]> {
    return [...this.skills.values()].map((skill) => skill.name);
  }

  async listSummaries(): Promise<SkillSummary[]> {
    return [...this.skills.values()].map((skill) => ({
      name: skill.name,
      metadata: skill.metadata,
    }));
  }

  async delete(name: SkillName): Promise<void> {
    this.skills.delete(name.value);
  }
}

class InMemoryMarketplaceRepository implements IMarketplaceRepository {
  readonly listings = new Map<string, MarketplaceListing>();
  isAvailable = true;

  async listListings(): Promise<MarketplaceListing[]> {
    EnsureMarketplaceIsAvailable(this.isAvailable);
    return [...this.listings.values()];
  }

  async getListing(skillName: string): Promise<MarketplaceListing | null> {
    EnsureMarketplaceIsAvailable(this.isAvailable);
    return this.listings.get(skillName) ?? null;
  }

  async saveListing(listing: MarketplaceListing): Promise<void> {
    EnsureMarketplaceIsAvailable(this.isAvailable);
    this.listings.set(listing.skillName, listing);
  }
}

function EnsureMarketplaceIsAvailable(isAvailable: boolean): void {
  if (!isAvailable) {
    throw new MarketplaceUnavailableError("Marketplace actions are temporarily unavailable.");
  }
}
