import type { SkillMetadata } from "./skill-metadata";
import type { SkillName } from "./skill-name";

export interface SkillSummary {
  name: SkillName;
  metadata: SkillMetadata;
}
