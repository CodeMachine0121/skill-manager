import type { SkillMetadata } from "./skill-metadata";
import { SkillName } from "./skill-name";

export class Skill {
  readonly name: SkillName;
  readonly content: string;
  readonly metadata: SkillMetadata;

  constructor(name: SkillName, content: string, metadata: SkillMetadata = {}) {
    if (!content || !content.trim()) {
      throw new Error("Skill content cannot be empty.");
    }
    this.name = name;
    this.content = content;
    this.metadata = metadata;
  }

  withContent(newContent: string): Skill {
    return new Skill(this.name, newContent, this.metadata);
  }

  withName(newName: SkillName): Skill {
    return new Skill(newName, this.content, this.metadata);
  }
}
