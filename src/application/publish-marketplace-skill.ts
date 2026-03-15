import {
  CreateMarketplaceListing,
  CreateMarketplaceShareLink,
  GetLatestMarketplaceRelease,
  MarketplaceOwnershipError,
  PublishMarketplaceRelease,
} from "../domain/marketplace-listing";
import { SkillName } from "../domain/skill-name";
import type { IMarketplaceRepository, ISkillRepository } from "../domain/ports";

export interface PublishMarketplaceSkillRequest {
  skillName: string;
  summary: string;
  tags: string[];
  version: string;
  releaseNotes: string;
  publisherId: string;
}

export interface PublishMarketplaceSkillResult {
  published: boolean;
  shareLink: string;
  latestVersion: string;
  message: string;
  missingFields: string[];
}

export interface PublishMarketplaceFlowState {
  canPublish: boolean;
  availableSkillNames: string[];
  message: string;
  guidanceActions: string[];
}

export class PublishMarketplaceSkillUseCase {
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly marketplaceRepository: IMarketplaceRepository,
  ) {}

  async getFlowState(): Promise<PublishMarketplaceFlowState> {
    const availableSkillNames = (await this.skillRepository.listAll())
      .map((skillName) => skillName.value)
      .sort((left, right) => left.localeCompare(right));

    if (availableSkillNames.length === 0) {
      return {
        canPublish: false,
        availableSkillNames: [],
        message: "Create or generate a skill before publishing it to the marketplace.",
        guidanceActions: ["create", "generate"],
      };
    }

    return {
      canPublish: true,
      availableSkillNames,
      message: "",
      guidanceActions: [],
    };
  }

  async publish(request: PublishMarketplaceSkillRequest): Promise<PublishMarketplaceSkillResult> {
    const flowState = await this.getFlowState();

    if (!flowState.canPublish) {
      return CreatePublishFailureResult(flowState.message);
    }

    const missingFields = CollectMissingPublishFields(request);

    if (missingFields.length > 0) {
      return CreatePublishFailureResult(
        `Missing marketplace details: ${missingFields.join(", ")}.`,
        missingFields,
      );
    }

    try {
      const skillName = new SkillName(request.skillName).value;
      const localSkill = await this.skillRepository.read(new SkillName(skillName));
      const existingListing = await this.marketplaceRepository.getListing(skillName);
      const nextListing = existingListing
        ? PublishMarketplaceRelease(existingListing, {
            ...request,
            skillName,
            content: localSkill.content,
          })
        : CreateMarketplaceListing({
            ...request,
            skillName,
            content: localSkill.content,
          });

      await this.marketplaceRepository.saveListing(nextListing);

      return {
        published: true,
        shareLink: CreateMarketplaceShareLink(skillName),
        latestVersion: GetLatestMarketplaceRelease(nextListing).version,
        message: existingListing
          ? `Published version '${request.version}' to the marketplace.`
          : `Published '${skillName}' to the marketplace.`,
        missingFields: [],
      };
    } catch (error) {
      if (error instanceof MarketplaceOwnershipError) {
        return CreatePublishFailureResult(error.message);
      }

      return CreatePublishFailureResult(
        error instanceof Error ? error.message : "Marketplace actions are temporarily unavailable.",
      );
    }
  }
}

function CollectMissingPublishFields(request: PublishMarketplaceSkillRequest): string[] {
  const missingFields = [
    request.summary.trim().length === 0 ? "summary" : "",
    request.tags.filter((tag) => tag.trim().length > 0).length === 0 ? "tags" : "",
    request.version.trim().length === 0 ? "version" : "",
  ];

  return missingFields.filter(Boolean);
}

function CreatePublishFailureResult(
  message: string,
  missingFields: string[] = [],
): PublishMarketplaceSkillResult {
  return {
    published: false,
    shareLink: "",
    latestVersion: "",
    message,
    missingFields,
  };
}
