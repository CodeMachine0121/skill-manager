import type { Skill } from "./skill";
import type { SkillName } from "./skill-name";
import type { SkillSnapshot } from "./skill-snapshot";

export interface ISkillRepository {
  exists(name: SkillName): Promise<boolean>;
  save(skill: Skill): Promise<void>;
  read(name: SkillName): Promise<Skill>;
  listAll(): Promise<SkillName[]>;
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
