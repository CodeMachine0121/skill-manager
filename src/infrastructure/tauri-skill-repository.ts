import { invoke } from "@tauri-apps/api/core";
import { Skill } from "../domain/skill";
import { SkillName } from "../domain/skill-name";
import type { ISkillRepository } from "../domain/ports";

export class TauriSkillRepository implements ISkillRepository {
  async exists(name: SkillName): Promise<boolean> {
    return invoke<boolean>("skill_exists", { name: name.value });
  }

  async save(skill: Skill): Promise<void> {
    await invoke("save_skill", {
      name: skill.name.value,
      content: skill.content,
    });
  }

  async read(name: SkillName): Promise<Skill> {
    const content = await invoke<string>("read_skill", { name: name.value });
    return new Skill(name, content);
  }

  async listAll(): Promise<SkillName[]> {
    const names = await invoke<string[]>("list_skills");
    return names.map((n) => new SkillName(n));
  }

  async delete(name: SkillName): Promise<void> {
    await invoke("delete_skill", { name: name.value });
  }
}
