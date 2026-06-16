# Documentation Index

- Read every Markdown file directly under `docs/` before starting agent work.
- Use this file as the table of contents.
- Keep all repository documentation in point form.
- Keep agent-facing documentation under `docs/`.
- Keep `AGENTS.md` and `CLAUDE.md` as entrypoints that point agents here.

## Required Agent Reading

- `docs/vision.md`
  - Product purpose.
  - User experience principles.
  - Scope boundaries.
- `docs/architecture.md`
  - Routes.
  - Main data flows.
  - Important modules.
  - Supabase boundaries.
- `docs/commands.md`
  - Development commands.
  - Verification commands.
  - Environment switching.
- `docs/agent-workflow.md`
  - Issue labels.
  - Triage flow.
  - Planning flow.
  - Implementation flow.
  - Review and smoke-test gates.
- `docs/smoke-test-checklists.md`
  - Manual smoke-test checklist starters.
  - Reviewer-facing checks for preview deployments.
- `docs/detection-service.md`
  - Board-detection service purpose and boundary.
  - `POST /detect` contract and auth.
  - Detection approach and known limitations.
  - Local development and Cloud Run deploy.
- `docs/supabase.md`
  - Local Supabase setup.
  - Migration rules.
  - Hosted Supabase safety rules.
- `docs/release.md`
  - Release checklist.
  - Tagging rules.

## Root Files

- `AGENTS.md`
  - Entry point for Codex-style agents.
  - Must point agents to read `docs/`.
- `CLAUDE.md`
  - Entry point for Claude-style agents.
  - Must point agents to read `docs/`.
- `README.md`
  - Short human-facing project summary.
  - Must stay point-form.
- `.github/PULL_REQUEST_TEMPLATE.md`
  - PR author checklist.
  - Must keep a `Smoke Tests For Reviewer` section.
