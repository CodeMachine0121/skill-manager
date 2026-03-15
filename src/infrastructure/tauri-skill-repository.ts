import { invoke } from "@tauri-apps/api/core";
import { Skill } from "../domain/skill";
import type { SkillMetadata } from "../domain/skill-metadata";
import { SkillName } from "../domain/skill-name";
import type { ISkillRepository } from "../domain/ports";
import type { SkillSummary } from "../domain/skill-summary";

interface StoredSkillRecord {
  content: string;
  metadata?: SkillMetadata;
}

interface StoredSkillSummary {
  name: string;
  metadata?: SkillMetadata;
}

export class TauriSkillRepository implements ISkillRepository {
  async exists(name: SkillName): Promise<boolean> {
    return invoke<boolean>("skill_exists", { name: name.value });
  }

  async save(skill: Skill): Promise<void> {
    await invoke("save_skill", {
      name: skill.name.value,
      content: skill.content,
      metadata: skill.metadata,
    });
  }

  async read(name: SkillName): Promise<Skill> {
    const storedSkill = await invoke<StoredSkillRecord>("read_skill", { name: name.value });
    return new Skill(name, storedSkill.content, storedSkill.metadata ?? {});
  }

  async listAll(): Promise<SkillName[]> {
    const names = await invoke<string[]>("list_skills");
    return names.map((skillName) => new SkillName(skillName));
  }

  async listSummaries(): Promise<SkillSummary[]> {
    const summaries = await invoke<StoredSkillSummary[]>("list_skill_summaries");
    return summaries.map((summary) => ({
      name: new SkillName(summary.name),
      metadata: summary.metadata ?? {},
    }));
  }

  async delete(name: SkillName): Promise<void> {
    await invoke("delete_skill", { name: name.value });
  }
}
