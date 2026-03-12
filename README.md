# Skill Manager

A desktop application for creating, generating, and managing [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills, powered by GitHub Copilot for AI generation.

Built with Tauri 2 + React + Rust.

## Features

- **AI-Powered Generation** — Describe what you need and let GitHub Copilot generate complete `SKILL.md` files
- **Manual Creation** — Write skill content directly with full control
- **Browse & Manage** — View, edit, refine, and delete installed skills
- **AI Refinement** — Edit existing skills with AI assistance and review changes in a GitHub-style diff viewer
- **Local Storage** — Skills are saved to `~/.claude/skills/` for use with Claude Code

## Prerequisites

- [Bun](https://bun.sh) 1.3+
- [Rust](https://rustup.rs/) 1.77.2+
- GitHub Copilot access (for AI features)

## Quick Start

```bash
# Install dependencies
bun install

# Start development server with hot reload
bun run tauri dev
```

## Build

```bash
# Build production app
bun run tauri build
```

Output: platform-specific bundles in `src-tauri/target/release/bundle/`

## Release

Releases are automated via GitHub Actions. Push a version tag to trigger a build:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This builds for:
- **Windows** — `.msi` (x86_64)
- **macOS** — `.dmg` / `.app` (Apple Silicon + Intel)

## Project Structure

```
src/                            # Frontend (React + TypeScript)
├── domain/                     # Entities & ports
│   ├── skill.ts
│   ├── skill-name.ts
│   └── ports.ts
├── application/                # Use cases
│   ├── manage-skill.ts
│   ├── generate-skill.ts
│   └── install-skill.ts
├── infrastructure/             # Tauri bridge & Copilot integration
│   ├── tauri-skill-repository.ts
│   ├── copilot-skill-generator.ts
│   └── context.ts
├── pages/                      # Views
│   ├── Home.tsx
│   ├── SkillList.tsx
│   ├── CreateSkill.tsx
│   ├── GenerateSkill.tsx
│   └── SkillDetail.tsx
└── components/                 # Reusable UI
    ├── Layout.tsx
    ├── SkillIcon.tsx
    ├── Toast.tsx
    └── PixelCat.tsx

src-tauri/                      # Backend (Rust)
├── src/
│   ├── main.rs
│   └── lib.rs                  # Tauri commands
└── tauri.conf.json
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, TypeScript, Vite 8 |
| Backend | Rust, Tauri 2, Tokio |
| AI | GitHub Copilot SDK |
| Package Manager | Bun |
| CI/CD | GitHub Actions |

## Skill Format

Skills are stored as `~/.claude/skills/<name>/SKILL.md`:

```markdown
---
name: my-skill
description: What this skill does
---

## Role
Define the AI persona.

## Workflow
Step-by-step processes.

## Coding Standards
Rules and constraints.
```

## License

MIT
