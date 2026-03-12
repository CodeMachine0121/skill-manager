import { Skill } from "../domain/skill";
import { SkillName } from "../domain/skill-name";
import type { ISkillRepository } from "../domain/ports";

export interface InstallSkillRequest {
  name: string;
  content: string;
  forceOverwrite?: boolean;
}

export interface InstallSkillResult {
  installed: boolean;
  alreadyExists: boolean;
  message: string;
}

export class InstallSkillUseCase {
  constructor(private readonly repository: ISkillRepository) {}

  async execute(request: InstallSkillRequest): Promise<InstallSkillResult> {
    try {
      const skillName = new SkillName(request.name);
      const skill = new Skill(skillName, request.content);
      const alreadyExists = await this.repository.exists(skillName);

      if (alreadyExists && !request.forceOverwrite) {
        return {
          installed: false,
          alreadyExists: true,
          message: `Skill '${request.name}' already exists.`,
        };
      }

      await this.repository.save(skill);
      return {
        installed: true,
        alreadyExists,
        message: alreadyExists
          ? `Skill '${request.name}' overwritten.`
          : `Skill '${request.name}' installed.`,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("Skill")) {
        throw error; // Re-throw validation errors
      }
      return {
        installed: false,
        alreadyExists: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
