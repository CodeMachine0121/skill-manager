import { beforeEach, describe, expect, it } from "bun:test";
import { AnalyzeSkillsUseCase } from "./skill-analytics";
import type { ISkillHistoryRepository, ISkillRepository } from "../domain/ports";
import { Skill } from "../domain/skill";
import { SkillName } from "../domain/skill-name";
import { SkillSnapshot } from "../domain/skill-snapshot";

describe("Skill analytics dashboard", () => {
  const fixedNow = new Date("2026-01-31T12:00:00.000Z");

  let skillRepository: FakeSkillRepository;
  let historyRepository: FakeHistoryRepository;
  let sut: AnalyzeSkillsUseCase;

  beforeEach(() => {
    skillRepository = new FakeSkillRepository();
    historyRepository = new FakeHistoryRepository();
    sut = new AnalyzeSkillsUseCase(skillRepository, historyRepository);
  });

  it("review portfolio analytics for local skills", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "release-notes-writer", description: "Draft release notes from merged pull requests." }),
      CreateSkill({ name: "bug-triage-coach", description: "Guide bug triage and prioritization." }),
      CreateSkill({ name: "meeting-notes-helper", description: "Turn transcripts into concise notes." }),
    );
    GivenHistoryRepositoryReturns("release-notes-writer", [
      CreateSnapshot({ name: "release-notes-writer", timestamp: "2026-01-30T10-00-00", body: "Latest release notes workflow" }),
      CreateSnapshot({ name: "release-notes-writer", timestamp: "2026-01-18T08-00-00", body: "Earlier release notes workflow" }),
    ]);
    GivenHistoryRepositoryReturns("bug-triage-coach", [
      CreateSnapshot({ name: "bug-triage-coach", timestamp: "2026-01-28T09-15-00", body: "Latest bug triage checklist" }),
    ]);
    GivenHistoryRepositoryReturns("meeting-notes-helper", [
      CreateSnapshot({ name: "meeting-notes-helper", timestamp: "2026-01-12T07-45-00", body: "Meeting notes summary template" }),
    ]);

    const dashboard = await sut.loadDashboard(CreateDashboardRequest());

    expect(dashboard.summary.installedSkillCount).toBe(3);
    expect(dashboard.summary.filteredSkillCount).toBe(3);
    expect(dashboard.recentlyUpdatedSkills.map((skill) => skill.name)).toEqual([
      "release-notes-writer",
      "bug-triage-coach",
      "meeting-notes-helper",
    ]);
    expect(dashboard.skills.map((skill) => skill.name)).toEqual([
      "release-notes-writer",
      "bug-triage-coach",
      "meeting-notes-helper",
    ]);
  });

  it("filter analytics to a recent period and matching skill names", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "release-notes-writer", description: "Draft release notes from merged pull requests." }),
      CreateSkill({ name: "bug-triage-coach", description: "Guide bug triage and prioritization." }),
      CreateSkill({ name: "meeting-notes-helper", description: "Turn transcripts into concise notes." }),
    );
    GivenHistoryRepositoryReturns("release-notes-writer", [
      CreateSnapshot({ name: "release-notes-writer", timestamp: "2025-12-01T08-00-00" }),
    ]);
    GivenHistoryRepositoryReturns("bug-triage-coach", [
      CreateSnapshot({ name: "bug-triage-coach", timestamp: "2026-01-20T14-30-00" }),
    ]);
    GivenHistoryRepositoryReturns("meeting-notes-helper", [
      CreateSnapshot({ name: "meeting-notes-helper", timestamp: "2026-01-22T10-00-00" }),
    ]);

    const dashboard = await sut.loadDashboard(CreateDashboardRequest({ periodDays: 30, searchTerm: "triage" }));

    expect(dashboard.summary.filteredSkillCount).toBe(1);
    expect(dashboard.skills.map((skill) => skill.name)).toEqual(["bug-triage-coach"]);
    expect(dashboard.skills[0]?.changesInPeriod).toBe(1);
    expect(dashboard.skills[0]?.filterMatch).toBe(true);
  });

  it("highlight skills that need attention", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "stale-skill", description: "Keeps legacy release chores on track." }),
      CreateSkill({ name: "missing-description-skill", description: null }),
    );
    GivenHistoryRepositoryReturns("stale-skill", [
      CreateSnapshot({ name: "stale-skill", timestamp: "2025-12-01T08-00-00" }),
    ]);
    GivenHistoryRepositoryReturns("missing-description-skill", [
      CreateSnapshot({ name: "missing-description-skill", timestamp: "2026-01-25T10-15-00" }),
    ]);

    const dashboard = await sut.loadDashboard(CreateDashboardRequest());

    const staleSkill = dashboard.skills.find((skill) => skill.name === "stale-skill");
    const missingDescriptionSkill = dashboard.skills.find((skill) => skill.name === "missing-description-skill");

    expect(staleSkill?.attentionFlags.map((flag) => flag.reason)).toContain("No updates in the last 30 days");
    expect(missingDescriptionSkill?.attentionFlags.map((flag) => flag.reason)).toContain("Missing description");
    expect(dashboard.summary.skillsNeedingAttention).toBe(2);
  });

  it("review a skill's change timeline", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "release-notes-writer", description: "Draft release notes from merged pull requests.", body: "Current release notes workflow" }),
    );
    GivenHistoryRepositoryReturns("release-notes-writer", [
      CreateSnapshot({ name: "release-notes-writer", timestamp: "2026-01-30T10-00-00", body: "Latest archived release notes workflow" }),
      CreateSnapshot({ name: "release-notes-writer", timestamp: "2026-01-18T08-00-00", body: "Earlier archived release notes workflow" }),
    ]);

    const detail = await sut.loadSkillDetail(CreateDetailRequest({ skillName: "release-notes-writer" }));

    expect(detail.timeline.map((snapshot) => snapshot.timestamp)).toEqual([
      "2026-01-30T10-00-00",
      "2026-01-18T08-00-00",
    ]);
    expect(detail.totalSavedVersions).toBe(2);
    expect(detail.currentVersionContent).toContain("Current release notes workflow");
    expect(detail.timeline[1]?.content).toContain("Earlier archived release notes workflow");
    expect(detail.hasRecentActivity).toBe(true);
  });

  it("show a stable skill with no recent changes", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "meeting-notes-helper", description: "Turn transcripts into concise notes.", body: "Current meeting notes template" }),
    );
    GivenHistoryRepositoryReturns("meeting-notes-helper", [
      CreateSnapshot({ name: "meeting-notes-helper", timestamp: "2025-11-25T09-30-00", body: "Archived meeting notes template" }),
    ]);

    const detail = await sut.loadSkillDetail(CreateDetailRequest({ skillName: "meeting-notes-helper", periodDays: 30 }));

    expect(detail.hasRecentActivity).toBe(false);
    expect(detail.timeline).toEqual([]);
    expect(detail.currentVersionContent).toContain("Current meeting notes template");
    expect(detail.latestArchivedChangeAt).toBe("2025-11-25T09-30-00");
  });

  it("export the current analytics view", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "bug-triage-coach", description: "Guide bug triage and prioritization." }),
      CreateSkill({ name: "release-notes-writer", description: "Draft release notes from merged pull requests." }),
    );
    GivenHistoryRepositoryReturns("bug-triage-coach", [
      CreateSnapshot({ name: "bug-triage-coach", timestamp: "2026-01-20T14-30-00" }),
    ]);
    GivenHistoryRepositoryReturns("release-notes-writer", [
      CreateSnapshot({ name: "release-notes-writer", timestamp: "2025-12-01T08-00-00" }),
    ]);

    const dashboard = await sut.loadDashboard(CreateDashboardRequest({ periodDays: 30, searchTerm: "triage" }));
    const report = sut.exportDashboard(dashboard);
    const parsed = JSON.parse(report) as {
      filter: { periodDays: number };
      skills: Array<{ name: string }>;
      summary: { filteredSkillCount: number };
      generatedAt: string;
    };

    expect(parsed.filter.periodDays).toBe(30);
    expect(parsed.skills.map((skill) => skill.name)).toEqual(["bug-triage-coach"]);
    expect(parsed.summary.filteredSkillCount).toBe(1);
    expect(parsed.generatedAt).toBe(fixedNow.toISOString());
  });

  it("show an empty state when no local skills exist", async () => {
    GivenSkillRepositoryContains();

    const dashboard = await sut.loadDashboard(CreateDashboardRequest());

    expect(dashboard.skills).toEqual([]);
    expect(dashboard.emptyState?.title).toBe("No local skills to analyze");
    expect(dashboard.emptyState?.primaryActionLabel).toBe("Create Skill");
    expect(dashboard.emptyState?.secondaryActionLabel).toBe("AI Generate");
  });

  it("tell the author when analytics data cannot be loaded", async () => {
    GivenSkillRepositoryFailsToList("library unavailable");

    await expect(sut.loadDashboard(CreateDashboardRequest())).rejects.toThrow(
      "Analytics data is temporarily unavailable.",
    );
  });

  it("tell the author when a selected skill is no longer available", async () => {
    GivenSkillRepositoryContains(
      CreateSkill({ name: "release-notes-writer", description: "Draft release notes from merged pull requests." }),
    );
    GivenSkillRepositoryFailsToRead("release-notes-writer", "missing on disk");

    await expect(
      sut.loadSkillDetail(CreateDetailRequest({ skillName: "release-notes-writer" })),
    ).rejects.toThrow("Skill 'release-notes-writer' is no longer available.");
  });

  function GivenSkillRepositoryContains(...skills: Skill[]) {
    skillRepository.setSkills(skills);
  }

  function GivenHistoryRepositoryReturns(skillName: string, snapshots: SkillSnapshot[]) {
    historyRepository.setSnapshots(skillName, snapshots);
  }

  function GivenSkillRepositoryFailsToList(message: string) {
    skillRepository.listError = new Error(message);
  }

  function GivenSkillRepositoryFailsToRead(skillName: string, message: string) {
    skillRepository.readErrors.set(skillName, new Error(message));
  }

  function CreateDashboardRequest(overrides?: Partial<{ periodDays: number; searchTerm: string; now: Date }>) {
    return {
      periodDays: overrides?.periodDays ?? 30,
      searchTerm: overrides?.searchTerm ?? "",
      now: overrides?.now ?? fixedNow,
    };
  }

  function CreateDetailRequest(overrides: Partial<{ skillName: string; periodDays: number; now: Date }> = {}) {
    return {
      skillName: overrides.skillName ?? "release-notes-writer",
      periodDays: overrides.periodDays ?? 30,
      now: overrides.now ?? fixedNow,
    };
  }
});

function CreateSkill(overrides: Partial<{ name: string; description: string | null; body: string }> = {}) {
  const name = overrides.name ?? "release-notes-writer";
  const content = CreateSkillContent({
    name,
    description: Object.prototype.hasOwnProperty.call(overrides, "description")
      ? overrides.description ?? null
      : `Description for ${name}.`,
    body: overrides.body ?? `Workflow for ${name}.`,
  });
  return new Skill(new SkillName(name), content);
}

function CreateSkillContent(input: { name: string; description: string | null; body: string }) {
  const descriptionBlock = input.description === null ? "" : `description: ${input.description}\n`;

  return `---
name: ${input.name}
${descriptionBlock}---

# ${input.name}

${input.body}
`;
}

function CreateSnapshot(overrides: Partial<{ name: string; timestamp: string; body: string }> = {}) {
  const name = overrides.name ?? "release-notes-writer";
  const timestamp = overrides.timestamp ?? "2026-01-30T10-00-00";
  const content = CreateSkillContent({
    name,
    description: `Snapshot description for ${name}.`,
    body: overrides.body ?? `Archived workflow for ${name}.`,
  });

  return new SkillSnapshot(new SkillName(name), timestamp, content);
}

class FakeSkillRepository implements ISkillRepository {
  readonly items = new Map<string, string>();
  readonly readErrors = new Map<string, Error>();
  listError: Error | null = null;

  async exists(name: SkillName): Promise<boolean> {
    return this.items.has(name.value);
  }

  async save(skill: Skill): Promise<void> {
    this.items.set(skill.name.value, skill.content);
  }

  async read(name: SkillName): Promise<Skill> {
    const readError = this.readErrors.get(name.value);

    if (readError) {
      throw readError;
    }

    const content = this.items.get(name.value);

    if (!content) {
      throw new Error(`Unknown skill: ${name.value}`);
    }

    return new Skill(name, content);
  }

  async listAll(): Promise<SkillName[]> {
    if (this.listError) {
      throw this.listError;
    }

    return [...this.items.keys()].sort().map((name) => new SkillName(name));
  }

  async delete(name: SkillName): Promise<void> {
    this.items.delete(name.value);
  }

  setSkills(skills: Skill[]) {
    this.items.clear();
    for (const skill of skills) {
      this.items.set(skill.name.value, skill.content);
    }
  }
}

class FakeHistoryRepository implements ISkillHistoryRepository {
  readonly snapshotsBySkill = new Map<string, SkillSnapshot[]>();

  async listSnapshots(name: SkillName): Promise<SkillSnapshot[]> {
    return [...(this.snapshotsBySkill.get(name.value) ?? [])].sort((left, right) =>
      right.timestamp.localeCompare(left.timestamp),
    );
  }

  async getSnapshot(name: SkillName, timestamp: string): Promise<SkillSnapshot> {
    const snapshot = (this.snapshotsBySkill.get(name.value) ?? []).find((item) => item.timestamp === timestamp);

    if (!snapshot) {
      throw new Error(`Unknown snapshot: ${timestamp}`);
    }

    return snapshot;
  }

  setSnapshots(skillName: string, snapshots: SkillSnapshot[]) {
    this.snapshotsBySkill.set(skillName, snapshots);
  }
}
