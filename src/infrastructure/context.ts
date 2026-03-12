import { createContext, useContext } from "react";
import { InstallSkillUseCase } from "../application/install-skill";
import { GenerateSkillUseCase } from "../application/generate-skill";
import { ManageSkillUseCase } from "../application/manage-skill";
import { TauriSkillRepository } from "./tauri-skill-repository";
import { CopilotSkillGenerator } from "./copilot-skill-generator";

const repository = new TauriSkillRepository();
const generator = new CopilotSkillGenerator();

export const useCases = {
  installSkill: new InstallSkillUseCase(repository),
  generateSkill: new GenerateSkillUseCase(generator),
  manageSkill: new ManageSkillUseCase(repository),
} as const;

interface AppContextType {
  installSkill: InstallSkillUseCase;
  generateSkill: GenerateSkillUseCase;
  manageSkill: ManageSkillUseCase;
}

export const AppContext = createContext<AppContextType>(useCases);

export function useAppContext(): AppContextType {
  return useContext(AppContext);
}
