import { SkillName } from "./skill-name";

export class SkillSnapshot {
  readonly name: SkillName;
  readonly timestamp: string;
  readonly content: string;

  constructor(name: SkillName, timestamp: string, content: string) {
    if (!timestamp || !timestamp.trim()) {
      throw new Error("Snapshot timestamp cannot be empty.");
    }
    if (!content || !content.trim()) {
      throw new Error("Snapshot content cannot be empty.");
    }
    this.name = name;
    this.timestamp = timestamp;
    this.content = content;
  }
}
