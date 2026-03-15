import { Skill } from "../domain/skill";
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
    const currentSkill = await ReadCurrentSkill(this.skillRepository, skillName);
    const restoredSkill = new Skill(skillName, snapshot.content, currentSkill?.metadata ?? {});
    await this.skillRepository.save(restoredSkill);
  }
}

async function ReadCurrentSkill(
  repository: ISkillRepository,
  skillName: SkillName,
): Promise<Skill | null> {
  try {
    return await repository.read(skillName);
  } catch {
    return null;
  }
}
