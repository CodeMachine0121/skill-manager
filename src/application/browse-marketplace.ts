import {
  CreateMarketplaceListingSummary,
  CreateMarketplaceShareLink,
  CreateRenamedMarketplaceCopyName,
  GetLatestMarketplaceRelease,
  ParseMarketplaceShareLink,
} from "../domain/marketplace-listing";
import type { MarketplaceListing, MarketplaceListingSummary } from "../domain/marketplace-listing";
import { Skill } from "../domain/skill";
import { SkillName } from "../domain/skill-name";
import type { IMarketplaceRepository, ISkillRepository } from "../domain/ports";

export interface BrowseMarketplaceResult {
  success: boolean;
  listings: MarketplaceListingSummary[];
  message: string;
}

export interface OpenMarketplaceListingRequest {
  skillName?: string;
  shareLink?: string;
}

export interface OpenMarketplaceListingResult {
  success: boolean;
  listing: MarketplaceListing | null;
  shareLink: string;
  latestVersion: string;
  message: string;
}

export interface ImportMarketplaceSkillRequest {
  skillName?: string;
  shareLink?: string;
  renameTo?: string;
  forceOverwrite?: boolean;
}

export interface ImportMarketplaceSkillResult {
  installed: boolean;
  alreadyExists: boolean;
  importedSkillName: string;
  listingId: string;
  marketplaceVersion: string;
  message: string;
  needsRename: boolean;
  suggestedName: string;
}

export class BrowseMarketplaceUseCase {
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
  ) {}

  async browse(): Promise<BrowseMarketplaceResult> {
    try {
      const listings = (await this.marketplaceRepository.listListings())
        .map(CreateMarketplaceListingSummary)
        .sort((left, right) => left.skillName.localeCompare(right.skillName));

      return {
        success: true,
        listings,
        message: "",
      };
    } catch (error) {
      return {
        success: false,
        listings: [],
        message: error instanceof Error ? error.message : "Marketplace actions are temporarily unavailable.",
      };
    }
  }

  async openListing(request: OpenMarketplaceListingRequest): Promise<OpenMarketplaceListingResult> {
    const listingName = ResolveMarketplaceListingName(request);

    if (!listingName) {
      return CreateMissingListingResult();
    }

    try {
      const listing = await this.marketplaceRepository.getListing(listingName);

      if (!listing) {
        return CreateMissingListingResult();
      }

      return {
        success: true,
        listing,
        shareLink: CreateMarketplaceShareLink(listing.skillName),
        latestVersion: GetLatestMarketplaceRelease(listing).version,
        message: "",
      };
    } catch (error) {
      return {
        success: false,
        listing: null,
        shareLink: "",
        latestVersion: "",
        message: error instanceof Error ? error.message : "Marketplace actions are temporarily unavailable.",
      };
    }
  }

  async importSkill(request: ImportMarketplaceSkillRequest): Promise<ImportMarketplaceSkillResult> {
    const listingResult = await this.openListing(request);

    if (!listingResult.success || !listingResult.listing) {
      return CreateImportFailureResult(listingResult.message);
    }

    try {
      const importedSkillName = request.renameTo?.trim() || listingResult.listing.skillName;
      const targetName = new SkillName(importedSkillName);
      const alreadyExists = await this.skillRepository.exists(targetName);

      if (alreadyExists && !request.forceOverwrite) {
        return {
          installed: false,
          alreadyExists: true,
          importedSkillName: "",
          listingId: "",
          marketplaceVersion: "",
          message: request.renameTo?.trim()
            ? `Skill '${importedSkillName}' already exists locally.`
            : `Skill '${listingResult.listing.skillName}' already exists locally. Choose a new name to keep both skills.`,
          needsRename: !request.renameTo?.trim(),
          suggestedName: request.renameTo?.trim()
            ? ""
            : CreateRenamedMarketplaceCopyName(
                listingResult.listing.skillName,
                listingResult.latestVersion,
              ),
        };
      }

      const latestRelease = GetLatestMarketplaceRelease(listingResult.listing);
      const importedSkill = new Skill(targetName, latestRelease.content, {
        marketplace: {
          listingId: listingResult.listing.skillName,
          version: latestRelease.version,
          shareLink: CreateMarketplaceShareLink(listingResult.listing.skillName),
          publisherId: listingResult.listing.publisherId,
        },
      });

      await this.skillRepository.save(importedSkill);

      return {
        installed: true,
        alreadyExists,
        importedSkillName: targetName.value,
        listingId: listingResult.listing.skillName,
        marketplaceVersion: latestRelease.version,
        message:
          targetName.value === listingResult.listing.skillName
            ? `Installed '${listingResult.listing.skillName}' from the marketplace.`
            : `Installed '${listingResult.listing.skillName}' as '${targetName.value}'.`,
        needsRename: false,
        suggestedName: "",
      };
    } catch (error) {
      return CreateImportFailureResult(
        error instanceof Error ? error.message : "Marketplace actions are temporarily unavailable.",
      );
    }
  }
}

function ResolveMarketplaceListingName(request: OpenMarketplaceListingRequest): string | null {
  return request.skillName?.trim() || ParseMarketplaceShareLink(request.shareLink ?? "");
}

function CreateMissingListingResult(): OpenMarketplaceListingResult {
  return {
    success: false,
    listing: null,
    shareLink: "",
    latestVersion: "",
    message: "This marketplace listing is no longer available.",
  };
}

function CreateImportFailureResult(message: string): ImportMarketplaceSkillResult {
  return {
    installed: false,
    alreadyExists: false,
    importedSkillName: "",
    listingId: "",
    marketplaceVersion: "",
    message,
    needsRename: false,
    suggestedName: "",
  };
}
