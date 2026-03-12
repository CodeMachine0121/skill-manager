const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export class SkillName {
  readonly value: string;

  constructor(value: string) {
    if (!value || !value.trim()) {
      throw new Error("Skill name cannot be empty.");
    }
    if (!KEBAB_CASE_PATTERN.test(value)) {
      throw new Error(
        "Skill name must be kebab-case: lowercase letters, numbers, and hyphens only (e.g. 'my-skill-1')."
      );
    }
    this.value = value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: SkillName): boolean {
    return this.value === other.value;
  }
}
