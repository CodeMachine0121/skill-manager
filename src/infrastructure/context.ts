import { createContext, useContext } from "react";
import { InstallSkillUseCase } from "../application/install-skill";
import { GenerateSkillUseCase } from "../application/generate-skill";
import { ManageSkillUseCase } from "../application/manage-skill";
import { ManageHistoryUseCase } from "../application/manage-history";
import { AnalyzeSkillsUseCase } from "../application/skill-analytics";
import { TauriSkillRepository } from "./tauri-skill-repository";
import { TauriSkillHistoryRepository } from "./tauri-skill-history-repository";
import { CopilotSkillGenerator } from "./copilot-skill-generator";

const repository = new TauriSkillRepository();
const historyRepository = new TauriSkillHistoryRepository();
const generator = new CopilotSkillGenerator();

export const useCases = {
  installSkill: new InstallSkillUseCase(repository),
  generateSkill: new GenerateSkillUseCase(generator),
  manageSkill: new ManageSkillUseCase(repository),
  manageHistory: new ManageHistoryUseCase(historyRepository, repository),
  analyzeSkills: new AnalyzeSkillsUseCase(repository, historyRepository),
} as const;

interface AppContextType {
  installSkill: InstallSkillUseCase;
  generateSkill: GenerateSkillUseCase;
  manageSkill: ManageSkillUseCase;
  manageHistory: ManageHistoryUseCase;
  analyzeSkills: AnalyzeSkillsUseCase;
}

export const AppContext = createContext<AppContextType>(useCases);

export function useAppContext(): AppContextType {
  return useContext(AppContext);
}
