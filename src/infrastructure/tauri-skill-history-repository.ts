import { invoke } from "@tauri-apps/api/core";
import { SkillName } from "../domain/skill-name";
import { SkillSnapshot } from "../domain/skill-snapshot";
import type { ISkillHistoryRepository } from "../domain/ports";

export class TauriSkillHistoryRepository implements ISkillHistoryRepository {
  async listSnapshots(name: SkillName): Promise<SkillSnapshot[]> {
    const timestamps = await invoke<string[]>("list_skill_snapshots", { name: name.value });
    const snapshots: SkillSnapshot[] = [];
    for (const ts of timestamps) {
      try {
        const content = await invoke<string>("read_skill_snapshot", { name: name.value, timestamp: ts });
        snapshots.push(new SkillSnapshot(name, ts, content));
      } catch {
        // Skip unreadable snapshots
      }
    }
    return snapshots;
  }

  async getSnapshot(name: SkillName, timestamp: string): Promise<SkillSnapshot> {
    const content = await invoke<string>("read_skill_snapshot", { name: name.value, timestamp });
    return new SkillSnapshot(name, timestamp, content);
  }
}
