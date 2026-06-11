# Smoke Test Checklists

Use these as starting points. Review agents should tailor them to the PR.

## Recording Flow

- Start a new game from `/`.
- Add several moves on the board.
- Step backward and forward through the move history.
- Confirm the displayed player, move number, and board state stay in sync.

## Stone Correction

- Open a recorded game with several moves.
- Enter stone correction mode.
- Select a stone or group relevant to the change.
- Confirm the correction control appears in the expected location.
- Apply and cancel correction flows as appropriate.
- Confirm normal recording still works after closing correction mode.

## Draft Board

- Create or open a draft board.
- Add black and white stones.
- Remove or replace stones if the PR affects editing.
- Refresh the page and confirm the draft state persists.

## Share Flow

- Create a share from a recorded game or draft.
- Open the generated `/shares/[slug]` page.
- Confirm the shared position is immutable from the viewer.
- Confirm captions, move labels, and controls match the task expectations.

## Open Graph Preview

- Open the share preview route for a known share.
- Confirm board position, caption, and spacing match the live share behavior.
- Confirm the final shared position is shown when the task affects variation or replay state.

## Changelog And Copy

- Open `/changelog`.
- Confirm the new entry is present when the PR changes user-facing behavior.
- Confirm updated copy is consistent between live UI, share UI, and changelog text where relevant.
