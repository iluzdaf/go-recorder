# Agent Workflow

## Goal

- Convert rough feedback into prioritized implementation tasks.
- Route tasks through triage, planning, implementation, review, smoke testing, and human merge.
- Keep the source of truth in GitHub issues and PRs, not only chat.
- Preserve original feedback as the intake record; triage must add structure without overwriting prior observations.
- Keep one issue per piece of feedback unless a split is needed for scope control.

## Labels

- `needs-triage`
  - Raw feedback that has not been converted into an actionable task.
- `needs-clarification`
  - Triage found open questions that must be answered before implementation.
- `ready-for-agent`
  - Triage is complete on the feedback issue.
  - The issue has enough detail for an implementation agent to start.
- `needs-plan`
  - PR label.
  - The work has been claimed and the next step is to propose a plan in the PR.
- `needs-plan-approval`
  - PR label.
  - A plan has been proposed in the PR.
  - Human approval is required before implementation.
- `in-progress`
  - PR label.
  - An agent is implementing an approved plan.
- `needs-review`
  - PR label.
  - Implementation is complete.
  - A separate review pass is needed.
- `smoke-test-ready`
  - PR label.
  - Review is complete.
  - The PR has a manual smoke-test checklist.
- `blocked`
  - Work cannot continue without a decision, credential, external service, or dependency.

## Default Flow

- `needs-triage`
- `ready-for-agent`
- draft PR with `needs-plan`
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
- Treat the feedback body and comments as the historical record.
- Do not rewrite or replace existing feedback text during triage.

## Triage Agent

- Convert `needs-triage` feedback into an implementation-ready task.
- Read the issue body and all comments before deciding whether open questions are answered.
- Preserve the original feedback body and comments.
- Append triage in a new comment instead of overwriting existing feedback.
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
- Keep the feedback issue as the task record by default.
- Do not create a separate Agent Task issue unless broad feedback must be split into multiple independently actionable tasks.
- Rename the feedback issue title to indicate triage completion when helpful, for example `[Triaged Feedback]: ...`.
- Keep `ready-for-agent` on the feedback issue until work is claimed in a PR.
- Remove `needs-triage` after triage is complete; use `needs-clarification` on the feedback issue only when open questions remain.

## Recommended Triage Record

- Append a triage comment on the feedback issue with:
  - A short triage status.
  - The distilled problem statement.
  - The desired outcome.
  - Acceptance criteria.
  - Open questions, if any.
- Keep implementation planning, approvals, and execution updates in the PR after handoff.

## Prioritization

- Prioritize core recording, correction, share, or data-loss bugs first.
- Prioritize confusing behavior in primary workflows next.
- Prioritize small repeated-use polish next.
- Prioritize refactors that unlock known follow-up work next.
- Prioritize nice-to-have improvements last.
- Prefer small independently mergeable tasks.
- Split broad feedback when one PR would mix unrelated behavior.

## Planning

- Open a draft PR when claiming a `ready-for-agent` issue.
- Move workflow labels from the issue to the PR once the draft PR exists.
- Write a plan before editing code for:
  - Non-trivial tasks.
  - Broad tasks.
  - Tasks with multiple plausible implementations.
- Put the plan in the PR description or a PR comment.
- Move the PR from `needs-plan` to `needs-plan-approval` after posting the plan.
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
- Open a draft PR linked to the feedback issue before substantial edits.
- Remove `ready-for-agent` from the issue once the PR is the active work surface.
- Add `needs-plan` to the PR.
- Write the implementation plan in the PR.
- Move the PR from `needs-plan` to `needs-plan-approval`.
- Wait for human approval before editing code.
- Move the PR to `in-progress` after approval.
- Implement the approved plan.
- Prefer one focused commit per plan step.
- Run relevant non-visual checks.
- Include the approved plan in the PR description.
- Include `Smoke Tests For Reviewer` in the PR description before requesting review.
- Move the PR to `needs-review` when implementation is ready.

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
- Do not update `content/changelog/en.json` or bump the version in `package.json` unless explicitly asked.
- Never modify hosted Supabase directly.
