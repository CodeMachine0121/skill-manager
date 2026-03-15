import type { Skill } from "./skill";
import type { SkillSnapshot } from "./skill-snapshot";

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const STALE_THRESHOLD_DAYS = 30;

export interface AnalyticsWindow {
  readonly periodDays: number;
  readonly label: string;
  readonly searchTerm: string;
  readonly generatedAt: Date;
  readonly windowStart: Date;
}

export interface SkillAnalyticsFilter {
  readonly periodDays: number;
  readonly label: string;
  readonly searchTerm: string;
  readonly windowStart: string;
}

export interface SkillAttentionFlag {
  readonly kind: "stale" | "missing-description";
  readonly reason: string;
}

export interface SkillAnalyticsRecord {
  readonly name: string;
  readonly description: string | null;
  readonly totalSavedVersions: number;
  readonly changesInPeriod: number;
  readonly lastUpdatedAt: string | null;
  readonly attentionFlags: readonly SkillAttentionFlag[];
  readonly filterMatch: boolean;
  readonly currentVersionExcerpt: string;
}

export interface RecentlyUpdatedSkill {
  readonly name: string;
  readonly timestamp: string;
}

export interface SkillAnalyticsSummary {
  readonly installedSkillCount: number;
  readonly filteredSkillCount: number;
  readonly skillsWithRecentChanges: number;
  readonly skillsNeedingAttention: number;
}

export interface SkillAnalyticsEmptyState {
  readonly title: string;
  readonly description: string;
  readonly primaryActionLabel: string;
  readonly primaryActionPath: string;
  readonly secondaryActionLabel: string;
  readonly secondaryActionPath: string;
}

export interface SkillAnalyticsDashboard {
  readonly generatedAt: string;
  readonly filter: SkillAnalyticsFilter;
  readonly summary: SkillAnalyticsSummary;
  readonly recentlyUpdatedSkills: readonly RecentlyUpdatedSkill[];
  readonly skills: readonly SkillAnalyticsRecord[];
  readonly emptyState: SkillAnalyticsEmptyState | null;
}

export interface SkillAnalyticsDetail {
  readonly generatedAt: string;
  readonly filter: SkillAnalyticsFilter;
  readonly skillName: string;
  readonly description: string | null;
  readonly currentVersionContent: string;
  readonly totalSavedVersions: number;
  readonly timeline: readonly SkillSnapshot[];
  readonly latestArchivedChangeAt: string | null;
  readonly hasRecentActivity: boolean;
}

export function CreateAnalyticsWindow(input: {
  readonly periodDays: number;
  readonly searchTerm?: string;
  readonly now?: Date;
}): AnalyticsWindow {
  const periodDays = Number.isFinite(input.periodDays) && input.periodDays > 0
    ? Math.floor(input.periodDays)
    : 30;
  const generatedAt = input.now ? new Date(input.now.getTime()) : new Date();
  const windowStart = new Date(generatedAt.getTime() - periodDays * MILLISECONDS_PER_DAY);

  return {
    periodDays,
    label: CreatePeriodLabel(periodDays),
    searchTerm: input.searchTerm?.trim() ?? "",
    generatedAt,
    windowStart,
  };
}

export function CreateSkillAnalyticsFilter(window: AnalyticsWindow): SkillAnalyticsFilter {
  return {
    periodDays: window.periodDays,
    label: window.label,
    searchTerm: window.searchTerm,
    windowStart: window.windowStart.toISOString(),
  };
}

export function CreateSkillAnalyticsRecord(input: {
  readonly skill: Skill;
  readonly snapshots: readonly SkillSnapshot[];
  readonly window: AnalyticsWindow;
}): SkillAnalyticsRecord {
  const orderedSnapshots = SortSnapshotsByRecency(input.snapshots);
  const recentSnapshots = FilterSnapshotsWithinWindow({
    snapshots: orderedSnapshots,
    window: input.window,
  });
  const description = ReadSkillDescription(input.skill.content);
  const lastUpdatedAt = orderedSnapshots[0]?.timestamp ?? null;

  return {
    name: input.skill.name.value,
    description,
    totalSavedVersions: orderedSnapshots.length,
    changesInPeriod: recentSnapshots.length,
    lastUpdatedAt,
    attentionFlags: CreateAttentionFlags({
      description,
      lastUpdatedAt,
      window: input.window,
    }),
    filterMatch: DoesSkillMatchSearch({
      skillName: input.skill.name.value,
      searchTerm: input.window.searchTerm,
    }),
    currentVersionExcerpt: CreateContentExcerpt(input.skill.content),
  };
}

export function CreateSkillAnalyticsDashboard(input: {
  readonly window: AnalyticsWindow;
  readonly records: readonly SkillAnalyticsRecord[];
}): SkillAnalyticsDashboard {
  const filteredRecords = input.records.filter((record) => record.filterMatch);
  const orderedRecords = [...filteredRecords].sort(CompareSkillAnalyticsRecord);
  const recentlyUpdatedSkills = CreateRecentlyUpdatedSkills(orderedRecords);

  return {
    generatedAt: input.window.generatedAt.toISOString(),
    filter: CreateSkillAnalyticsFilter(input.window),
    summary: {
      installedSkillCount: input.records.length,
      filteredSkillCount: filteredRecords.length,
      skillsWithRecentChanges: filteredRecords.filter((record) => record.changesInPeriod > 0).length,
      skillsNeedingAttention: filteredRecords.filter((record) => record.attentionFlags.length > 0).length,
    },
    recentlyUpdatedSkills,
    skills: orderedRecords,
    emptyState: input.records.length === 0 ? CreateEmptyAnalyticsState() : null,
  };
}

export function CreateSkillAnalyticsDetail(input: {
  readonly skill: Skill;
  readonly snapshots: readonly SkillSnapshot[];
  readonly window: AnalyticsWindow;
}): SkillAnalyticsDetail {
  const orderedSnapshots = SortSnapshotsByRecency(input.snapshots);
  const timeline = FilterSnapshotsWithinWindow({
    snapshots: orderedSnapshots,
    window: input.window,
  });

  return {
    generatedAt: input.window.generatedAt.toISOString(),
    filter: CreateSkillAnalyticsFilter(input.window),
    skillName: input.skill.name.value,
    description: ReadSkillDescription(input.skill.content),
    currentVersionContent: input.skill.content,
    totalSavedVersions: orderedSnapshots.length,
    timeline,
    latestArchivedChangeAt: orderedSnapshots[0]?.timestamp ?? null,
    hasRecentActivity: timeline.length > 0,
  };
}

export function CreateDashboardReport(dashboard: SkillAnalyticsDashboard): string {
  return JSON.stringify(
    {
      generatedAt: dashboard.generatedAt,
      filter: dashboard.filter,
      summary: dashboard.summary,
      recentlyUpdatedSkills: dashboard.recentlyUpdatedSkills,
      skills: dashboard.skills,
    },
    null,
    2,
  );
}

export function CreatePeriodLabel(periodDays: number): string {
  return `Last ${periodDays} days`;
}

export function CreateEmptyAnalyticsState(): SkillAnalyticsEmptyState {
  return {
    title: "No local skills to analyze",
    description: "Create or generate a skill first to start tracking local analytics.",
    primaryActionLabel: "Create Skill",
    primaryActionPath: "/create",
    secondaryActionLabel: "AI Generate",
    secondaryActionPath: "/generate",
  };
}

export function CreateRecentlyUpdatedSkills(records: readonly SkillAnalyticsRecord[]): readonly RecentlyUpdatedSkill[] {
  return records
    .filter((record) => record.lastUpdatedAt !== null)
    .sort(CompareSkillAnalyticsRecordByRecency)
    .slice(0, 5)
    .map((record) => ({
      name: record.name,
      timestamp: record.lastUpdatedAt!,
    }));
}

export function CompareSkillAnalyticsRecord(left: SkillAnalyticsRecord, right: SkillAnalyticsRecord): number {
  return CompareAttentionCounts(left, right)
    || CompareNullableTimestamps(right.lastUpdatedAt, left.lastUpdatedAt)
    || left.name.localeCompare(right.name);
}

export function CompareSkillAnalyticsRecordByRecency(left: SkillAnalyticsRecord, right: SkillAnalyticsRecord): number {
  return CompareNullableTimestamps(right.lastUpdatedAt, left.lastUpdatedAt)
    || left.name.localeCompare(right.name);
}

export function CompareAttentionCounts(left: SkillAnalyticsRecord, right: SkillAnalyticsRecord): number {
  return right.attentionFlags.length - left.attentionFlags.length;
}

export function CompareNullableTimestamps(left: string | null, right: string | null): number {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return -1;
  }

  if (right === null) {
    return 1;
  }

  return left.localeCompare(right);
}

export function DoesSkillMatchSearch(input: {
  readonly skillName: string;
  readonly searchTerm: string;
}): boolean {
  if (!input.searchTerm.trim()) {
    return true;
  }

  return input.skillName.toLowerCase().includes(input.searchTerm.trim().toLowerCase());
}

export function CreateAttentionFlags(input: {
  readonly description: string | null;
  readonly lastUpdatedAt: string | null;
  readonly window: AnalyticsWindow;
}): readonly SkillAttentionFlag[] {
  const missingDescriptionFlag = CreateMissingDescriptionFlag(input.description);
  const staleFlag = CreateStaleFlag({
    lastUpdatedAt: input.lastUpdatedAt,
    window: input.window,
  });

  return [missingDescriptionFlag, staleFlag].filter((flag): flag is SkillAttentionFlag => flag !== null);
}

export function CreateMissingDescriptionFlag(description: string | null): SkillAttentionFlag | null {
  return description
    ? null
    : {
        kind: "missing-description",
        reason: "Missing description",
      };
}

export function CreateStaleFlag(input: {
  readonly lastUpdatedAt: string | null;
  readonly window: AnalyticsWindow;
}): SkillAttentionFlag | null {
  const lastUpdatedAt = input.lastUpdatedAt ? ParseSkillTimestamp(input.lastUpdatedAt) : null;
  const staleThreshold = new Date(
    input.window.generatedAt.getTime() - STALE_THRESHOLD_DAYS * MILLISECONDS_PER_DAY,
  );

  if (!lastUpdatedAt || lastUpdatedAt < staleThreshold) {
    return {
      kind: "stale",
      reason: `No updates in the last ${STALE_THRESHOLD_DAYS} days`,
    };
  }

  return null;
}

export function SortSnapshotsByRecency(snapshots: readonly SkillSnapshot[]): readonly SkillSnapshot[] {
  return [...snapshots].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
}

export function FilterSnapshotsWithinWindow(input: {
  readonly snapshots: readonly SkillSnapshot[];
  readonly window: AnalyticsWindow;
}): readonly SkillSnapshot[] {
  return input.snapshots.filter((snapshot) =>
    IsSnapshotWithinWindow({
      timestamp: snapshot.timestamp,
      window: input.window,
    }),
  );
}

export function IsSnapshotWithinWindow(input: {
  readonly timestamp: string;
  readonly window: AnalyticsWindow;
}): boolean {
  const snapshotDate = ParseSkillTimestamp(input.timestamp);

  if (!snapshotDate) {
    return false;
  }

  return snapshotDate >= input.window.windowStart && snapshotDate <= input.window.generatedAt;
}

export function ParseSkillTimestamp(timestamp: string): Date | null {
  const isoTimestamp = timestamp.replace(/T(\d{2})-(\d{2})-(\d{2})$/, "T$1:$2:$3");
  const parsedDate = new Date(`${isoTimestamp}Z`);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function ReadSkillDescription(content: string): string | null {
  const frontmatter = ReadFrontmatter(content);
  const descriptionLine = frontmatter
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith("description:"));

  if (!descriptionLine) {
    return null;
  }

  const description = descriptionLine.replace(/^description:\s*/, "").trim().replace(/^["']|["']$/g, "");
  return description || null;
}

export function ReadFrontmatter(content: string): string {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  return frontmatterMatch?.[1] ?? "";
}

export function CreateContentExcerpt(content: string): string {
  const excerptSource = StripFrontmatter(content).replace(/\s+/g, " ").trim();
  return excerptSource.slice(0, 120);
}

export function StripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*/m, "").trim();
}
