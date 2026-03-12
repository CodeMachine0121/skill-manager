import { SkillName } from "./skill-name";

export class Skill {
  readonly name: SkillName;
  readonly content: string;

  constructor(name: SkillName, content: string) {
    if (!content || !content.trim()) {
      throw new Error("Skill content cannot be empty.");
    }
    this.name = name;
    this.content = content;
  }

  withContent(newContent: string): Skill {
    return new Skill(this.name, newContent);
  }
}
