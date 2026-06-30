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
- `needs-approval`
  - Triage has converted feedback into a candidate task.
  - A project collaborator or owner must confirm scope before an agent may start implementation.
  - Human-gated label.
  - Agents may add this label when the issue is ready for approval.
  - Agents must not remove this label or replace it with `ready-for-agent`.
  - A project collaborator or owner must explicitly change labels to move the issue past this gate.
- `needs-clarification`
  - Triage found open questions that must be answered before implementation.
- `ready-for-agent`
  - A project collaborator or owner has explicitly approved agent work by changing labels.
  - The issue has enough detail for product automation to create the draft planning PR.
  - This label does not authorize code edits by itself.
  - Product automation removes this label only after the draft PR exists and is linked to the issue.
- `needs-plan`
  - PR label.
  - Product automation has created or found a draft PR and the next step is to propose a plan in the PR.
  - Planning agents may process PRs with this label.
- `needs-plan-approval`
  - PR label.
  - A plan has been proposed in the PR and implementation must not start yet.
  - A project collaborator or owner must approve the plan before implementation.
  - Human-gated label.
  - Agents may add this label when the PR plan is ready for approval.
  - Agents must not remove this label or replace it with `in-progress`.
  - A project collaborator or owner must explicitly change labels to move the PR past this gate.
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
  - Human merge gate.
  - Agents and review agents may add this label when the PR is ready for final human review and merge consideration.
  - Agents must not remove this label or merge the PR.
  - A project collaborator or owner approves this gate by reviewing and merging the PR.
- `merge-ready`
  - PR label.
  - Human-owned label for PRs that are ready for final merge consideration.
- `blocked`
  - Work cannot continue without a decision, credential, external service, or dependency.
  - Human-gated label.
  - Agents may add this label when work cannot continue.
  - Agents must not remove this label or continue blocked work.
  - A project collaborator or owner must explicitly change labels to move the issue or PR past this gate.

## Default Flow

- `needs-triage`
- `needs-approval`
- project collaborator or owner explicitly changes labels
- `ready-for-agent`
- product automation creates or finds a linked draft PR with `needs-plan`
- planning agent posts a plan in the PR
- `needs-plan-approval`
- project collaborator or owner explicitly changes labels
- `in-progress`
- `needs-review`
- `smoke-test-ready`
- `merge-ready`
- project collaborator or owner reviews and merges to `main`

## Blocked Flow

- `blocked` is a side gate, not part of the default happy path.
- Agents may add `blocked` to an issue or PR when work cannot continue.
- When adding `blocked`, explain the exact decision, credential, external service, or dependency needed.
- Agents must stop the blocked work after adding `blocked`.
- Agents must not remove `blocked`.
- Agents must not continue blocked work while `blocked` remains unchanged by a project collaborator or owner.
- The blocked gate is passed only when a project collaborator or owner explicitly changes labels.
- For a planning-stage block, the unblock label is `needs-plan`.

## Comment And Label Authority

- Comments may provide feedback, clarification, decisions, and review context.
- Labels control issue and PR workflow authorization before implementation.
- Human merge controls final release authorization.
- Issue triage may continue from comments while the issue is in `needs-triage`, `needs-clarification`, or `needs-approval`.
- Comments must not move work past `needs-approval`, `needs-plan-approval`, or `blocked`.
- Agents must not infer gate completion from comments, chat, plans, or elapsed time.
- Agents must verify the current PR has already passed through `needs-plan` and `needs-plan-approval` before editing code.
- `needs-approval`, `needs-plan-approval`, and `blocked` are human-gated labels.
- Agents may add human-gated labels when the issue or PR is ready for a decision.
- Agents must never remove human-gated labels.
- Agents must never replace human-gated labels with the next workflow label.
- Human-gated labels are passed only when a project collaborator or owner explicitly changes GitHub labels.
- If a gate decision is stated without the label change, ask a project collaborator or owner to update the labels and stop before the gated work.
- `smoke-test-ready` is completed by human merge, not by a required pre-merge label change.

## Ready For Agent Automation

- Product repository automation owns the transition from issue `ready-for-agent` to draft PR `needs-plan`.
- The automation runs when `ready-for-agent` is applied to an issue by a project collaborator or owner.
- The automation may also be run manually with:
  - `issue_number`: required.
  - `branch_name`: optional exceptional override.
- Default branch name: `codex/issue-<number>-<slug>`.
- The automation must:
  - Verify the issue is open and labeled `ready-for-agent`.
  - Create or reuse the claim branch from current `main`.
  - Create an empty claim commit only when a new branch is needed.
  - Create or reuse a draft PR linked to the issue.
  - Add `needs-plan` to the PR.
  - Link the PR and issue both ways so the PR is discoverable from the issue and the issue is discoverable from the PR.
  - Remove `ready-for-agent` from the issue only after the draft PR exists.
  - Stop before writing a plan or editing code.
- The PR body should include `Closes #<issue_number>` so merging the PR closes the linked issue.

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
- Ask at least three concise clarification questions during triage before moving the issue forward.
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
- Do not mark a task `ready-for-agent`; a project collaborator or owner label change is required.
- Move the feedback issue to `needs-approval` after triage is complete but before a project collaborator or owner explicitly changes labels.
- Keep the feedback issue as the task record by default.
- Do not create a separate Agent Task issue unless broad feedback must be split into multiple independently actionable tasks.
- Rename the feedback issue title to indicate triage completion when helpful, for example `[Triaged Feedback]: ...`.
- Keep `needs-approval` on the feedback issue until a project collaborator or owner explicitly changes labels.
- Do not remove `needs-approval`.
- Do not add `ready-for-agent`; a project collaborator or owner must explicitly add it to move past the approval gate.
- Remove `needs-triage` after triage is complete; use `needs-clarification` on the feedback issue only when open questions remain.
- If a project collaborator, owner, or commenter responds with clarification instead of changing labels, continue the triage loop.
- Use new comments to refine or append the triage record.
- Keep or add `needs-clarification` while more answers are needed.
- Move back to `needs-approval` only when the candidate task is clear and ready for approval.
- Do not treat clarification comments as approval to add `ready-for-agent`.
- Do not treat clarification comments as rejection unless the comment explicitly rejects the task.

## Recommended Triage Record

- Append a triage comment on the feedback issue with:
  - A short triage status.
  - The distilled problem statement.
  - The desired outcome.
  - Acceptance criteria.
  - Open questions, if any.
- If the issue remains ambiguous, ask at least three concise clarification questions in the thread before moving past triage.
- Resolve product, UX, and behavior choices during triage before planning starts; do not defer an unanswered product choice into the planning step.
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

- Plan only from an existing draft PR labeled `needs-plan`.
- If an active PR already exists for the issue, update that PR instead of creating a duplicate.
- Before writing the PR plan, read the linked issue body, all issue comments, and the latest triage record.
- Base the PR plan on the triage record's problem, desired outcome, acceptance criteria, constraints, relevant files, verification expectations, and smoke test draft.
- If unresolved open questions, planning decisions, or scope changes from the triage record remain, add `blocked` instead of `needs-plan-approval`.
- When adding `blocked` during planning, explain the blocker in the PR and stop.
- A project collaborator or owner unblocks planning by answering or deciding and changing labels from `blocked` to `needs-plan`.
- After unblocking, revise the plan before moving to `needs-plan-approval`.
- Do not edit code until the plan exists in the PR and the PR is past `needs-plan-approval`.
- If the plan or approval gate is missing when implementation would start, add `blocked` and stop.
- Write a plan before editing code for:
  - Non-trivial tasks.
  - Broad tasks.
  - Tasks with multiple plausible implementations.
- Put the plan in the PR description or a PR comment.
- Move the PR from `needs-plan` to `needs-plan-approval` after posting the plan.
- Wait for a project collaborator or owner to explicitly change labels before implementation.
- Do not remove `needs-plan-approval`.
- Do not add `in-progress`; a project collaborator or owner must explicitly add it to move past the plan approval gate.
- Confirm the PR already passed through `needs-plan` and `needs-plan-approval` before the first code edit.
- If that history is missing, stop and mark the work blocked instead of continuing.
- Skip planning only when the user explicitly says to skip planning for that request, including tiny mechanical changes.
- A good plan includes:
  - Small ordered steps.
  - Likely files.
  - Test targets.
  - Risks.
  - Tradeoffs.
  - Open user decisions.

## Implementation Agent

- Implementation is human-owned for now after the plan approval gate.
- Wait for a project collaborator or owner to explicitly change labels before editing code.
- Do not remove `needs-plan-approval`.
- Do not add `in-progress`; a project collaborator or owner must explicitly add it to move past the plan approval gate.
- Implement the approved plan one step at a time.
- Stop after completing each approved step and wait for further instructions before starting the next step.
- Prefer one focused commit per plan step.
- Run type checks, focused tests, and lint on changed files.
- Run the app locally and verify as many smoke tests as possible.
- Include the approved plan in the PR description.
- Include `Smoke Tests For Reviewer` in the PR description, marking any items the agent already verified.
- Move the PR to `needs-review` when implementation is ready.

## Verification

- Prefer `pnpm typecheck`.
- Prefer focused Vitest targets for changed logic.
- Prefer focused ESLint targets for changed files when practical.
- Run `git diff --check`.
- Run the app locally and work through smoke tests; mark each verified item in the PR.
- Report unreliable or hanging checks.
- Do not hide known full-suite failures.
- Explain unrelated full-suite failures in PR notes.

## Smoke Tests

- Every PR that changes behavior must include `Smoke Tests For Reviewer`.
- Smoke tests must use `- [ ]` checkbox format.
- Smoke tests should be short and concrete.
- Smoke tests should be tailored from `docs/smoke-test-checklists.md`.
- Smoke tests should cover the user-facing workflow changed by the PR.
- Smoke tests should include visual confirmation steps when visual behavior matters.
- Agents must run the app locally and verify as many smoke tests as possible before moving to `needs-review`.
- Mark each locally verified item with `[x]` and note it was agent-verified.
- Leave as `[ ]` any items that require a real device, a preview deployment, or human judgement.
- A human is required only for remaining unverified items and the final merge.
- Review agents must add or refine missing smoke tests before moving a task to `smoke-test-ready`.
- Review agents may add `smoke-test-ready` when the PR is ready for final human review.
- Review agents must not remove `smoke-test-ready`.
- Review agents must not merge the PR.

## Review Agent

- Review from a bug-risk stance.
- Lead with correctness issues.
- Call out behavioral regressions.
- Call out missing tests or weak verification.
- Call out scope creep.
- Call out copy, route, and UI consistency problems.
- Add or refine `Smoke Tests For Reviewer` in the PR.
- Run the app locally and verify any smoke test items not yet marked verified.

## Human Merge Gate

- Merge only after required code review issues are resolved.
- Merge only after automated and focused checks are acceptable.
- Merge only after all smoke tests are verified or failures are explicitly accepted.
- Human review is required for any smoke test item the agent could not verify locally.
- Merge only while the PR remains scoped to the task.
- `smoke-test-ready` means ready for final human review and merge consideration.
- A project collaborator or owner approves the final gate by reviewing and merging the PR.
- The PR closing through merge is the normal completion path; no pre-merge label change is required.
- Agents must not remove `smoke-test-ready` or merge into `main`.
- After merge, repeat from the next prioritized `ready-for-agent` task.

## Repo Rules

- Preserve unrelated user changes in the worktree.
- Prefer minimal focused diffs.
- Avoid new dependencies unless necessary.
- Use strict TypeScript.
- Keep helper inputs as narrow as practical.
- Check `lib/messages/en.json` for user-facing copy changes.
- Do not update `content/changelog/en.json` or bump the version in `package.json` unless explicitly asked.
- Never modify hosted Supabase directly.
