import { Skill } from "../domain/skill";
import { SkillName } from "../domain/skill-name";
import type { ISkillRepository } from "../domain/ports";

export class ManageSkillUseCase {
  constructor(private readonly repository: ISkillRepository) {}

  async listAll(): Promise<SkillName[]> {
    return this.repository.listAll();
  }

  async getSkill(name: string): Promise<Skill> {
    return this.repository.read(new SkillName(name));
  }

  async updateSkill(name: string, newContent: string): Promise<void> {
    const skillName = new SkillName(name);
    const skill = new Skill(skillName, newContent);
    await this.repository.save(skill);
  }

  async deleteSkill(name: string): Promise<void> {
    await this.repository.delete(new SkillName(name));
  }
}
