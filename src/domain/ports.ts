import type { Skill } from "./skill";
import type { SkillName } from "./skill-name";

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
