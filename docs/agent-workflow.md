# Agent Workflow

## Goal

- Convert rough feedback into prioritized implementation tasks.
- Route tasks through triage, planning, implementation, review, smoke testing, and human merge.
- Keep the source of truth in GitHub issues and PRs, not only chat.

## Labels

- `needs-triage`
  - Raw feedback that has not been converted into an actionable task.
- `needs-clarification`
  - Triage found open questions that must be answered before implementation.
- `ready-for-agent`
  - Triage is complete.
  - The task has enough detail for an implementation agent to start.
- `needs-plan`
  - An agent has claimed the task.
  - The next step is to propose an implementation plan before editing code.
- `needs-plan-approval`
  - A plan has been proposed.
  - Human approval is required before implementation.
- `in-progress`
  - An agent is implementing an approved plan.
- `needs-review`
  - Implementation is complete.
  - A separate review pass is needed.
- `smoke-test-ready`
  - Review is complete.
  - The PR has a manual smoke-test checklist.
- `blocked`
  - Work cannot continue without a decision, credential, external service, or dependency.

## Default Flow

- `needs-triage`
- `ready-for-agent`
- `needs-plan`
- `needs-plan-approval`
- `in-progress`
- `needs-review`
- `smoke-test-ready`

## Feedback Intake

- Create a Feedback issue for:
  - Rough observations.
  - Bugs.
  - Feature ideas.
  - Usability friction.
- Feedback does not need acceptance criteria.
- Feedback needs enough context for triage to understand the problem.
- Good feedback includes:
  - Route or workflow involved.
  - What happened.
  - What was expected.
  - Why it matters.
  - Screenshots when relevant.
  - Share links when relevant.
  - Device and browser details when relevant.
  - Prior discussion when relevant.

## Triage Agent

- Convert `needs-triage` feedback into an implementation-ready task.
- Read the issue body and all comments before deciding whether open questions are answered.
- Include:
  - Type.
  - Problem.
  - Desired outcome.
  - Acceptance criteria.
  - Constraints.
  - Relevant files.
  - Verification expectations.
  - Smoke test draft.
- Use implementation plan drafts only when the path is obvious.
- State relevant files as guidance, not certainty.
- Add `needs-clarification` when requirements are unclear.
- Ask concise concrete questions when requirements are unclear.
- Do not mark a task `ready-for-agent` until ambiguity is removed.
- Create or update an Agent Task issue when requirements are clear.
- Replace `needs-triage` or `needs-clarification` with `ready-for-agent` when ready.
- Link back to the original feedback when triage creates a new issue.

## Prioritization

- Prioritize core recording, correction, share, or data-loss bugs first.
- Prioritize confusing behavior in primary workflows next.
- Prioritize small repeated-use polish next.
- Prioritize refactors that unlock known follow-up work next.
- Prioritize nice-to-have improvements last.
- Prefer small independently mergeable tasks.
- Split broad feedback when one PR would mix unrelated behavior.

## Planning

- Move claimed tasks from `ready-for-agent` to `needs-plan`.
- Write a plan before editing code for:
  - Non-trivial tasks.
  - Broad tasks.
  - Tasks with multiple plausible implementations.
- Move tasks from `needs-plan` to `needs-plan-approval` after posting the plan.
- Wait for human approval before implementation.
- Skip planning only for tiny mechanical changes when the user explicitly allows it.
- A good plan includes:
  - Small ordered steps.
  - Likely files.
  - Test targets.
  - Risks.
  - Tradeoffs.
  - Open user decisions.
  - No local visual testing unless explicitly requested.

## Implementation Agent

- Switch to `main`.
- Pull latest remote changes.
- Create a feature branch with the `codex/` prefix unless instructed otherwise.
- Move the task from `ready-for-agent` to `needs-plan`.
- Write the implementation plan.
- Move the task from `needs-plan` to `needs-plan-approval`.
- Wait for human approval before editing code.
- Move the task to `in-progress` after approval.
- Implement the approved plan.
- Prefer one focused commit per plan step.
- Run relevant non-visual checks.
- Open a PR linked to the task.
- Include the approved plan in the PR description.
- Include `Smoke Tests For Reviewer` in the PR description before requesting review.
- Move the task to `needs-review` when implementation is ready.

## Verification

- Do not try to visually test locally.
- Prefer `pnpm typecheck`.
- Prefer focused Vitest targets for changed logic.
- Prefer focused ESLint targets for changed files when practical.
- Run `git diff --check`.
- Report unreliable or hanging checks.
- Do not hide known full-suite failures.
- Explain unrelated full-suite failures in PR notes.

## Smoke Tests

- Every PR that changes behavior must include `Smoke Tests For Reviewer`.
- Smoke tests must use `- [ ]` checkbox format.
- Smoke tests should be short and concrete.
- Smoke tests should be executable against a preview deployment or relevant environment.
- Smoke tests should be tailored from `docs/smoke-test-checklists.md`.
- Smoke tests should cover the user-facing workflow changed by the PR.
- Smoke tests should include visual confirmation steps when visual behavior matters.
- Agents should not perform local visual testing unless explicitly asked.
- Review agents must add or refine missing smoke tests before moving a task to `smoke-test-ready`.

## Review Agent

- Review from a bug-risk stance.
- Lead with correctness issues.
- Call out behavioral regressions.
- Call out missing tests or weak verification.
- Call out scope creep.
- Call out copy, route, and UI consistency problems.
- Add or refine `Smoke Tests For Reviewer` in the PR.
- Do not require local visual testing.
- Put visual confirmation in preview smoke tests when needed.

## Human Merge Gate

- Merge only after required code review issues are resolved.
- Merge only after automated and focused checks are acceptable.
- Merge only after smoke tests pass or failures are explicitly accepted.
- Merge only while the PR remains scoped to the task.
- After merge, repeat from the next prioritized `ready-for-agent` task.

## Repo Rules

- Do not try to visually test locally.
- Preserve unrelated user changes in the worktree.
- Prefer minimal focused diffs.
- Avoid new dependencies unless necessary.
- Use strict TypeScript.
- Keep helper inputs as narrow as practical.
- Check `lib/messages/en.json` for user-facing copy changes.
- Usually update `content/changelog/en.json` for user-facing behavior changes.
- Never modify hosted Supabase directly.
