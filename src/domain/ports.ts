import type { MarketplaceListing } from "./marketplace-listing";
import type { Skill } from "./skill";
import type { SkillName } from "./skill-name";
import type { SkillSnapshot } from "./skill-snapshot";
import type { SkillSummary } from "./skill-summary";

export interface ISkillRepository {
  exists(name: SkillName): Promise<boolean>;
  save(skill: Skill): Promise<void>;
  read(name: SkillName): Promise<Skill>;
  listAll(): Promise<SkillName[]>;
  listSummaries(): Promise<SkillSummary[]>;
  delete(name: SkillName): Promise<void>;
}

export interface ISkillGenerator {
  generateAsync(requirementDescription: string): Promise<string>;
  refineAsync(existingContent: string, editInstruction: string): Promise<string>;
}

export interface ISkillHistoryRepository {
  listSnapshots(name: SkillName): Promise<SkillSnapshot[]>;
  getSnapshot(name: SkillName, timestamp: string): Promise<SkillSnapshot>;
}

export interface IMarketplaceRepository {
  listListings(): Promise<MarketplaceListing[]>;
  getListing(skillName: string): Promise<MarketplaceListing | null>;
  saveListing(listing: MarketplaceListing): Promise<void>;
}
