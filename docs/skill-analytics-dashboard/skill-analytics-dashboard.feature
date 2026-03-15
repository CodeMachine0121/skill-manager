Feature: Skill analytics dashboard

  Rule: Authors can review portfolio-level skill activity

    Scenario: Review portfolio analytics for local skills
      Given Ava has installed skills named "release-notes-writer", "bug-triage-coach", and "meeting-notes-helper"
      And each skill has saved versions in the local library
      When Ava opens the analytics dashboard
      Then Ava sees a portfolio summary for the installed skills
      And Ava sees which skills were updated most recently

    Scenario: Filter analytics to a recent period and matching skill names
      Given Ava is viewing analytics for the local skill library
      When Ava limits the dashboard to the last 30 days and searches for "triage"
      Then Ava sees analytics only for matching skills in the chosen period

    Scenario: Highlight skills that need attention
      Given Ava has one skill that has not been updated recently
      And Ava has another skill that is missing a description
      When Ava reviews the analytics dashboard
      Then Ava sees those skills flagged as needing attention
      And Ava sees why each skill needs attention

  Rule: Authors can inspect activity for a single skill

    Scenario: Review a skill's change timeline
      Given Ava is viewing analytics for the skill "release-notes-writer"
      And the skill has multiple saved versions
      When Ava opens the skill's activity detail
      Then Ava sees the skill's change timeline for the selected period
      And Ava can compare an earlier version with the current version

    Scenario: Show a stable skill with no recent changes
      Given Ava selects a skill that has no changes in the selected period
      When Ava opens the skill's activity detail
      Then Ava sees that the skill had no recent activity
      And Ava can still review the skill's latest saved version

  Rule: Authors can keep a record of the analytics view

    Scenario: Export the current analytics view
      Given Ava has filtered the analytics dashboard to a set of local skills
      When Ava exports the current analytics view
      Then Ava receives a local report with the same filtered analytics data

  Rule: Authors see meaningful limits and failures

    Scenario: Show an empty state when no local skills exist
      Given Ava has no installed skills
      When Ava opens the analytics dashboard
      Then Ava is told that there are no local skills to analyze
      And Ava is guided to create or generate a skill first

    Scenario: Tell the author when analytics data cannot be loaded
      Given Ava is trying to open the analytics dashboard
      When the local skill library cannot be read
      Then Ava is told that analytics data is temporarily unavailable
      And Ava can retry loading the dashboard

    Scenario: Tell the author when a selected skill is no longer available
      Given Ava selected analytics for "release-notes-writer"
      When the skill is removed from the local library before the detail opens
      Then Ava is told that the skill is no longer available
      And Ava is returned to the analytics dashboard
