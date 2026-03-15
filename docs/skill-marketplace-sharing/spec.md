# Feature: Skill marketplace sharing

## Summary
Skill Manager adds a public marketplace flow for packaging installed skills with share metadata, publishing versioned listings, browsing community skills, and importing selected listings into the local library. The goal is to replace copy-paste distribution with a first-class sharing loop while keeping imported skills editable locally. Analytics, ratings, comments, private marketplaces, and validation or testing workflows are out of scope for this feature.

## Happy Cases
- A publisher selects an installed skill, adds marketplace details, and publishes it as a public listing that returns a shareable import link.

## Scenario Groups
### Happy path
- Publish a local skill as a new marketplace listing and receive a shareable import link.

### Alternative flows
- Guide a user to create or generate a skill when there is nothing local to publish.
- Install a marketplace skill from the marketplace browser.
- Install a marketplace skill from a shared link.
- Publish a new version of an existing marketplace listing.
- Keep both skills by importing a renamed copy when the local name is already taken.

### Failure paths
- Stop publishing when required marketplace details are incomplete.
- Tell the user when a marketplace listing is no longer available.
- Tell the user when the marketplace is temporarily unavailable.

### Permissions and access
- Prevent a non-owner from publishing over an existing marketplace listing.

### Observable side effects
- Publishing creates a public listing and a shareable import link.
- Importing adds a new local skill that keeps its marketplace origin and version information.
- Publishing a new version makes the new release available for future installs.

## Scope Boundaries
- Public community marketplace only; no private or team-only sharing in this slice.
- No ratings, reviews, comments, downloads, or analytics.
- No automated skill validation or test execution as part of publish or import.
- Imported skills become local copies that can be edited independently after install.
