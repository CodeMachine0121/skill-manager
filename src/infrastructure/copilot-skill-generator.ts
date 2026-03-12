import { invoke } from "@tauri-apps/api/core";
import type { ISkillGenerator } from "../domain";

export class CopilotSkillGenerator implements ISkillGenerator {
  async generateAsync(requirementDescription: string): Promise<string> {
    try {
      return await invoke<string>("generate_skill_content", {
        requirement: requirementDescription,
      });
    } catch (error) {
      throw new Error(
        `Communication error with Copilot: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async refineAsync(
    existingContent: string,
    editInstruction: string
  ): Promise<string> {
    try {
      return await invoke<string>("refine_skill_content", {
        existingContent,
        editInstruction,
      });
    } catch (error) {
      throw new Error(
        `Communication error with Copilot: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

