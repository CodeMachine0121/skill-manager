import { SkillName } from "../domain/skill-name";
import { SkillSnapshot } from "../domain/skill-snapshot";
import type { ISkillHistoryRepository, ISkillRepository } from "../domain/ports";

export class ManageHistoryUseCase {
  constructor(
    private readonly historyRepository: ISkillHistoryRepository,
    private readonly skillRepository: ISkillRepository,
  ) {}

  async listSnapshots(name: string): Promise<SkillSnapshot[]> {
    return this.historyRepository.listSnapshots(new SkillName(name));
  }

  async getSnapshot(name: string, timestamp: string): Promise<SkillSnapshot> {
    return this.historyRepository.getSnapshot(new SkillName(name), timestamp);
  }

  async restoreSnapshot(name: string, timestamp: string): Promise<void> {
    const snapshot = await this.historyRepository.getSnapshot(new SkillName(name), timestamp);
    const skillName = new SkillName(name);
    const { Skill } = await import("../domain/skill");
    const skill = new Skill(skillName, snapshot.content);
    await this.skillRepository.save(skill);
  }
}
