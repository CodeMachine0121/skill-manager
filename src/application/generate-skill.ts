import type { ISkillGenerator } from "../domain/ports";

export interface GenerateSkillResult {
  generatedContent: string;
  success: boolean;
  errorMessage?: string;
}

export class GenerateSkillUseCase {
  constructor(private readonly generator: ISkillGenerator) {}

  async executeAsync(requirementDescription: string): Promise<GenerateSkillResult> {
    try {
      const content = await this.generator.generateAsync(requirementDescription);
      return { generatedContent: content, success: true };
    } catch (error) {
      return {
        generatedContent: "",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async refineAsync(
    existingContent: string,
    editInstruction: string
  ): Promise<GenerateSkillResult> {
    try {
      const content = await this.generator.refineAsync(existingContent, editInstruction);
      return { generatedContent: content, success: true };
    } catch (error) {
      return {
        generatedContent: "",
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
