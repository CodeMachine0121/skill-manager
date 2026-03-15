import { createContext, useContext } from "react";
import { BrowseMarketplaceUseCase } from "../application/browse-marketplace";
import { GenerateSkillUseCase } from "../application/generate-skill";
import { InstallSkillUseCase } from "../application/install-skill";
import { ManageHistoryUseCase } from "../application/manage-history";
import { ManageSkillUseCase } from "../application/manage-skill";
import { PublishMarketplaceSkillUseCase } from "../application/publish-marketplace-skill";
import { TauriMarketplaceRepository } from "./tauri-marketplace-repository";
import { TauriSkillHistoryRepository } from "./tauri-skill-history-repository";
import { TauriSkillRepository } from "./tauri-skill-repository";
import { CopilotSkillGenerator } from "./copilot-skill-generator";

const repository = new TauriSkillRepository();
const historyRepository = new TauriSkillHistoryRepository();
const marketplaceRepository = new TauriMarketplaceRepository();
const generator = new CopilotSkillGenerator();

export const useCases = {
  browseMarketplace: new BrowseMarketplaceUseCase(repository, marketplaceRepository),
  installSkill: new InstallSkillUseCase(repository),
  generateSkill: new GenerateSkillUseCase(generator),
  manageSkill: new ManageSkillUseCase(repository),
  manageHistory: new ManageHistoryUseCase(historyRepository, repository),
  publishMarketplace: new PublishMarketplaceSkillUseCase(repository, marketplaceRepository),
} as const;

interface AppContextType {
  browseMarketplace: BrowseMarketplaceUseCase;
  installSkill: InstallSkillUseCase;
  generateSkill: GenerateSkillUseCase;
  manageSkill: ManageSkillUseCase;
  manageHistory: ManageHistoryUseCase;
  publishMarketplace: PublishMarketplaceSkillUseCase;
}

export const AppContext = createContext<AppContextType>(useCases);

export function useAppContext(): AppContextType {
  return useContext(AppContext);
}
