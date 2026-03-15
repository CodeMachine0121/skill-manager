import type { SkillSummary } from "../domain/skill-summary";
import { SkillName } from "../domain/skill-name";
import type { ISkillRepository } from "../domain/ports";

export class ManageSkillUseCase {
  constructor(private readonly repository: ISkillRepository) {}

  async listAll(): Promise<SkillName[]> {
    return this.repository.listAll();
  }

  async listSummaries(): Promise<SkillSummary[]> {
    return this.repository.listSummaries();
  }

  async getSkill(name: string) {
    return this.repository.read(new SkillName(name));
  }

  async updateSkill(name: string, newContent: string): Promise<void> {
    const skillName = new SkillName(name);
    const currentSkill = await this.repository.read(skillName);
    await this.repository.save(currentSkill.withContent(newContent));
  }

  async deleteSkill(name: string): Promise<void> {
    await this.repository.delete(new SkillName(name));
  }
}
