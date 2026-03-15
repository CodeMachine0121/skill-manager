Feature: Skill marketplace sharing

  Rule: Publishers can share local skills with the community

    Scenario: Publish a local skill as a new marketplace listing
      Given Ava has an installed skill named "release-notes-writer"
      And Ava has added a summary, tags, and version "1.0.0" for sharing
      When Ava publishes the skill to the marketplace
      Then the skill is published as a public marketplace listing
      And Ava receives a shareable import link for the listing

    Scenario: Publish a new version of an existing marketplace listing
      Given Ava owns a marketplace listing for "release-notes-writer" at version "1.0.0"
      And Ava has updated the local skill and prepared version "1.1.0" with release notes
      When Ava publishes the updated skill to the marketplace
      Then the marketplace listing shows version "1.1.0" as the latest release
      And marketplace users can install the new version

    Scenario: Guide a user who has no local skills to share
      Given Ava has no installed skills
      When Ava opens the marketplace sharing flow
      Then Ava is guided to create or generate a skill before publishing

  Rule: Users can discover and import marketplace skills

    Scenario: Install a marketplace skill from the browser
      Given Maya is browsing public marketplace listings
      And "release-notes-writer" is available at version "1.1.0"
      When Maya installs "release-notes-writer" from the marketplace
      Then Maya sees the skill in the local skill library
      And the imported skill keeps its marketplace version information

    Scenario: Install a marketplace skill from a shared link
      Given Maya opens a shared marketplace link for "release-notes-writer"
      When Maya installs the published skill
      Then Maya sees the skill in the local skill library
      And Maya can identify the original marketplace listing from the imported skill

    Scenario: Keep both skills when an imported skill name is already taken
      Given Maya already has a local skill named "release-notes-writer"
      And Maya chooses a marketplace listing with the same skill name
      When Maya imports the marketplace skill as a renamed copy
      Then Maya sees both the existing skill and the imported copy in the local skill library

  Rule: Users see predictable marketplace limits and failures

    Scenario: Stop publishing when required listing details are incomplete
      Given Ava has selected a local skill to publish
      And Ava has not finished the required marketplace details
      When Ava tries to publish the skill
      Then Ava is told which marketplace details are still required

    Scenario: Prevent someone else from publishing over an existing listing
      Given Ava owns a marketplace listing for "release-notes-writer"
      And Ben is not the listing owner
      When Ben tries to publish changes to that listing
      Then Ben is told that only the listing owner can publish a new version

    Scenario: Tell the user when a marketplace listing is no longer available
      Given Maya opens a marketplace listing that has been removed
      When Maya tries to view or install the listing
      Then Maya is told that the listing is no longer available

    Scenario: Tell the user when the marketplace is temporarily unavailable
      Given Maya is browsing the marketplace
      When the marketplace cannot be reached
      Then Maya is told that marketplace actions are temporarily unavailable
