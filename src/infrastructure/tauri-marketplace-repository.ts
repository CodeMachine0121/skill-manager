import { invoke } from "@tauri-apps/api/core";
import { MarketplaceUnavailableError, type MarketplaceListing } from "../domain/marketplace-listing";
import type { IMarketplaceRepository } from "../domain/ports";

export class TauriMarketplaceRepository implements IMarketplaceRepository {
  async listListings(): Promise<MarketplaceListing[]> {
    return InvokeMarketplaceCommand<MarketplaceListing[]>("list_marketplace_listings");
  }

  async getListing(skillName: string): Promise<MarketplaceListing | null> {
    return InvokeMarketplaceCommand<MarketplaceListing | null>("read_marketplace_listing", {
      name: skillName,
    });
  }

  async saveListing(listing: MarketplaceListing): Promise<void> {
    await InvokeMarketplaceCommand("save_marketplace_listing", { listing });
  }
}

async function InvokeMarketplaceCommand<T>(
  command: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  try {
    return await invoke<T>(command, payload);
  } catch (error) {
    throw new MarketplaceUnavailableError(
      error instanceof Error ? error.message : "Marketplace actions are temporarily unavailable.",
    );
  }
}
