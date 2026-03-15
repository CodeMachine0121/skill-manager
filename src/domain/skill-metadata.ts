export interface MarketplaceSkillOrigin {
  listingId: string;
  version: string;
  shareLink: string;
  publisherId: string;
}

export interface SkillMetadata {
  marketplace?: MarketplaceSkillOrigin;
}
