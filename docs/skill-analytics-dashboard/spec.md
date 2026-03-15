# Feature: Skill analytics dashboard

## Summary
Skill Manager adds a read-only analytics dashboard for the local skill library. Authors can review portfolio activity, spot skills that may need attention, filter the dashboard to a recent window or search term, drill into a single skill's change timeline, and export the current view for planning. The feature is limited to local metadata and version history; marketplace performance, automated validation results, runtime usage telemetry, and editing or publishing workflows are out of scope.

## Happy Cases
- An author opens the analytics dashboard and reviews portfolio activity for local skills.
- An author drills into one skill and reviews its change timeline.

## Scenario Groups
### Happy path
- Review portfolio analytics for local skills.
- Drill into a skill's change timeline.

### Alternative flows
- Filter analytics to a time window and search term.
- Highlight skills that need attention because they are stale or missing basic metadata.
- Export the current analytics view as a local report.

### Boundary conditions
- Show an empty analytics state when the local library has no skills.
- Show a neutral detail view when a selected skill has no changes in the chosen period.

### Failure paths
- Tell the author when analytics data cannot be loaded from the local library.
- Tell the author when a selected skill is no longer available.

## Scope Boundaries
- Local skill analytics only; no marketplace download counts, ratings, or sharing performance.
- No automated validation scores, pass/fail badges, or test execution results.
- No runtime telemetry from Claude Code sessions or external services.
- Analytics is read-only and does not create, edit, refine, or publish skills.
