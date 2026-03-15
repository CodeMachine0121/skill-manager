import type { Skill } from "../domain/skill";
import type { SkillSnapshot } from "../domain/skill-snapshot";
import { SkillName } from "../domain/skill-name";
import type { ISkillHistoryRepository, ISkillRepository } from "../domain/ports";
import {
  CreateAnalyticsWindow,
  CreateDashboardReport,
  CreateSkillAnalyticsDashboard,
  CreateSkillAnalyticsDetail,
  CreateSkillAnalyticsRecord,
  type SkillAnalyticsDashboard,
  type SkillAnalyticsDetail,
} from "../domain/skill-analytics";

export interface LoadSkillAnalyticsDashboardRequest {
  readonly periodDays: number;
  readonly searchTerm?: string;
  readonly now?: Date;
}

export interface LoadSkillAnalyticsDetailRequest {
  readonly skillName: string;
  readonly periodDays: number;
  readonly now?: Date;
}

export interface SkillAnalyticsSource {
  readonly skill: Skill;
  readonly snapshots: readonly SkillSnapshot[];
}

export class SkillAnalyticsLoadError extends Error {
  constructor() {
    super("Analytics data is temporarily unavailable.");
    this.name = "SkillAnalyticsLoadError";
  }
}

export class SkillAnalyticsMissingSkillError extends Error {
  constructor(skillName: string) {
    super(`Skill '${skillName}' is no longer available.`);
    this.name = "SkillAnalyticsMissingSkillError";
  }
}

export class AnalyzeSkillsUseCase {
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly historyRepository: ISkillHistoryRepository,
  ) {}

  async loadDashboard(
    request: LoadSkillAnalyticsDashboardRequest,
  ): Promise<SkillAnalyticsDashboard> {
    const window = CreateAnalyticsWindow(request);

    try {
      const skillNames = await this.skillRepository.listAll();
      const sources = await Promise.all(
        skillNames.map((skillName) =>
          LoadSkillAnalyticsSource({
            skillRepository: this.skillRepository,
            historyRepository: this.historyRepository,
            skillName,
          }),
        ),
      );
      const records = sources.map((source) =>
        CreateSkillAnalyticsRecord({
          skill: source.skill,
          snapshots: source.snapshots,
          window,
        }),
      );

      return CreateSkillAnalyticsDashboard({
        window,
        records,
      });
    } catch {
      throw new SkillAnalyticsLoadError();
    }
  }

  async loadSkillDetail(
    request: LoadSkillAnalyticsDetailRequest,
  ): Promise<SkillAnalyticsDetail> {
    const window = CreateAnalyticsWindow({
      periodDays: request.periodDays,
      now: request.now,
    });
    const skillName = new SkillName(request.skillName);

    try {
      const skill = await this.skillRepository.read(skillName);
      const snapshots = await this.historyRepository.listSnapshots(skillName).catch(() => {
        throw new SkillAnalyticsLoadError();
      });

      return CreateSkillAnalyticsDetail({
        skill,
        snapshots,
        window,
      });
    } catch (error) {
      if (error instanceof SkillAnalyticsLoadError) {
        throw error;
      }

      throw new SkillAnalyticsMissingSkillError(request.skillName);
    }
  }

  exportDashboard(dashboard: SkillAnalyticsDashboard): string {
    return CreateDashboardReport(dashboard);
  }
}

export async function LoadSkillAnalyticsSource(input: {
  readonly skillRepository: ISkillRepository;
  readonly historyRepository: ISkillHistoryRepository;
  readonly skillName: SkillName;
}): Promise<SkillAnalyticsSource> {
  const [skill, snapshots] = await Promise.all([
    input.skillRepository.read(input.skillName),
    input.historyRepository.listSnapshots(input.skillName),
  ]);

  return {
    skill,
    snapshots,
  };
}
