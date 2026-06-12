# Agent Workflow

This workflow turns rough feedback into prioritized implementation tasks, then routes those tasks through implementation, review, and human merge.

## Labels

- `needs-triage`: raw feedback that has not been converted into an actionable task.
- `needs-clarification`: triage found open questions that must be answered before implementation.
- `ready-for-agent`: triage is complete and the task has enough detail for an implementation agent to start.
- `needs-plan`: an agent has claimed the task and must propose an implementation plan before editing code.
- `needs-plan-approval`: a plan has been proposed and is waiting for human approval.
- `in-progress`: an agent has claimed the task and is implementing it.
- `needs-review`: implementation is complete and ready for a separate review pass.
- `smoke-test-ready`: review is complete and the PR has a manual smoke test checklist.
- `blocked`: work cannot continue without a decision, credential, external service, or dependency.

Default task flow: `needs-triage` -> `ready-for-agent` -> `needs-plan` -> `needs-plan-approval` -> `in-progress` -> `needs-review` -> `smoke-test-ready`.

## Feedback Intake

Create a Feedback issue for rough observations, bugs, feature ideas, or usability friction. Feedback does not need acceptance criteria. It only needs enough context for triage to understand the problem.

Good feedback usually includes:

- The route or workflow involved.
- What happened.
- What was expected.
- Why it matters.
- Screenshots, share links, device/browser details, or prior discussion when relevant.

## Triage Agent

The triage agent converts `needs-triage` feedback into an implementation-ready task.

Triage output should include:

- Type: bug fix, feature, polish, refactor, or documentation.
- Problem: the user-facing or technical issue.
- Desired outcome: the target behavior.
- Acceptance criteria: concrete conditions for completion.
- Constraints: repo workflow, design, copy, Supabase, or compatibility limits.
- Relevant files: likely starting points, stated as guidance rather than certainty.
- Implementation plan draft: optional starter steps when the path is obvious.
- Verification: non-visual checks expected from the implementation agent.
- Smoke test draft: manual checks that a reviewer can refine.

If requirements are unclear, the triage agent should:

- Add the `needs-clarification` label.
- Ask concise, concrete questions.
- Avoid creating a `ready-for-agent` task until the answers remove implementation ambiguity.

When requirements are clear, the triage agent should:

- Create or update an Agent Task issue.
- Replace `needs-triage` or `needs-clarification` with `ready-for-agent`.
- Keep a link back to the original feedback when triage creates a new issue.

## Prioritization

Prioritize ready tasks by impact, confidence, and size:

1. Core recording, correction, share, or data-loss bugs.
2. Confusing behavior in primary workflows.
3. Small polish that improves repeated use.
4. Refactors that unlock known follow-up work.
5. Nice-to-have improvements.

Prefer small, independently mergeable tasks. Split broad feedback when one PR would mix unrelated behavior.

## Planning And Approval

Before implementation starts, an agent may pick up an issue labeled `ready-for-agent` and move it to `needs-plan`. The assigned agent should write a plan and wait for approval when the task is non-trivial, broad, or could be implemented multiple ways.

The plan should:

- Break the work into small ordered steps.
- Keep each step narrow enough to become one focused commit.
- Identify likely files and test targets.
- Call out risks, tradeoffs, and any user decisions still needed.
- Avoid local visual testing unless the user explicitly asks for it.

If the plan exposes unclear requirements, the agent should:

- Add or keep the `needs-clarification` label.
- Ask concise questions before editing code.
- Update the plan after the answers are clear.

When the plan is approved, the implementation agent should:

- Move the task from `needs-plan-approval` to `in-progress`.
- Copy the approved plan into the PR description.
- Use one commit per plan step unless a step is too small to stand alone or the PR explains the exception.

Implementation must not start until the human reviewer approves the plan, except for tiny mechanical changes where the user explicitly skips planning.

## Implementation Agent

An implementation agent may pick up an issue labeled `ready-for-agent`.

Required workflow:

1. Switch to `main`.
2. Pull latest remote changes.
3. Create a feature branch using the `codex/` prefix unless instructed otherwise.
4. Move the task from `ready-for-agent` to `needs-plan`.
5. Write an implementation plan and move the task from `needs-plan` to `needs-plan-approval` when the task is non-trivial.
6. Wait for human approval before editing code.
7. Implement the approved plan as focused commits, with one commit per plan step by default.
8. Run relevant non-visual checks.
9. Open a PR linked to the task and include the approved plan in the PR description.
10. Move the task to `needs-review`.

Repo-specific rules:

- Do not try to visually test locally.
- Preserve unrelated user changes in the worktree.
- Prefer `pnpm typecheck`, focused Vitest targets, and `git diff --check`.
- Treat `pnpm lint` as useful but not a dependable default signal if it hangs.
- For user-facing copy changes, check `lib/messages/en.json` and usually update `content/changelog/en.json`.
- Never modify hosted Supabase directly.

## Review Agent

The review agent should review the PR from a bug-risk stance, not a summary stance.

Review output should lead with:

- Correctness issues.
- Behavioral regressions.
- Missing tests or weak verification.
- Scope creep.
- Copy, route, and UI consistency problems.

The review agent must also add or refine `Smoke Tests For Reviewer` in the PR. Smoke tests should be short, concrete, and executable against the preview deployment or relevant environment.

Review should not require local visual testing. If visual confirmation matters, put it in the smoke test checklist for preview review.

## Human Merge Gate

The human reviewer checks the review findings and smoke tests. Merge only when:

- Required code review issues are resolved.
- Automated and focused checks are acceptable.
- Smoke tests pass or any failures are explicitly accepted.
- The PR remains scoped to the task.

After merge, repeat from the next prioritized `ready-for-agent` task.
