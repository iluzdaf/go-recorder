# Smoke Test Checklists

- Use these as starting points.
- Tailor the list to the PR.
- Include the tailored list in `Smoke Tests For Reviewer` using `- [ ]` checkbox format.
- Run these against the preview deployment or relevant environment.
- Do not use these as a reason for agents to visually test locally.

## Recording Flow

- Start a new game from `/`.
- Confirm the chosen board size, handicap, draft source, and player details match the home setup.
- Add several moves on the board.
- Step backward and forward through the move history.
- Confirm the displayed player, move number, and board state stay in sync.
- Refresh the page.
- Confirm the game returns to the same route with the board still visible.

## Stone Correction

- Open a recorded game with several moves.
- Enter stone correction mode.
- Select a stone or group relevant to the change.
- Confirm the correction control appears in the expected location.
- Apply and cancel correction flows as appropriate.
- Resize or rotate the viewport if the PR affects board layout or safe-area behavior.
- Confirm the correction control remains reachable and does not jump during drag.
- Confirm normal recording still works after closing correction mode.

## Action Bar Placement

- Open a recording board on a landscape viewport.
- Drag the floating action bar handle from left to right.
- Confirm the action bar snaps to the expected side and remains usable.
- Drag the floating action bar handle back from right to left.
- Confirm the action bar snaps back and does not cover the board unexpectedly.

## Settings And Board Display

- Open a recording board.
- Show the header if it is collapsed.
- Open Settings.
- Confirm the compact Settings dialog opens without leaving the board.
- Toggle appearance, board coordinates, or two-step placement if the PR affects settings.
- Refresh the page.
- Confirm the changed compact setting persists.
- Open Settings again and choose Show more.
- Confirm the full `/settings` page opens.
- Confirm App settings appear above Board settings.
- Confirm advanced board theme controls and local-data controls are visible on the full Settings page.
- Toggle board coordinates off.
- Confirm the recording board uses the reclaimed space.
- Confirm edge placement still works with touch or pointer input.
- Toggle board coordinates on.
- Confirm coordinates are visible and not clipped.
- Change the board theme if the PR affects theme handling.
- Confirm the selected board theme appears on recording, draft, and share boards.
- Open a draft board.
- Confirm the same coordinate setting applies.
- Open a share board.
- Confirm the same coordinate setting applies.
- Rotate the device or resize the viewport.
- Confirm the board, theme, and coordinate settings remain stable.

## Header

- Open `/`.
- Confirm the header is collapsed by default and the Show header control is visible.
- Open a draft board.
- Confirm the header is still collapsed by default.
- Tap Show header.
- Confirm the header appears and primary header actions are reachable.
- Tap outside the header.
- Confirm the header collapses again.

## Draft Board

- Create or open a draft board.
- Add black and white stones.
- Remove or replace stones if the PR affects editing.
- Refresh the page and confirm the draft state persists.
- Return to `/` and create a second draft.
- Confirm the second draft gets a different URL.
- Reopen the first draft.
- Confirm both drafts remain accessible.

## Draft From Image

- On `/`, choose From image.
- Create a draft.
- Confirm the image overlay opens.
- Choose a board photo or screenshot.
- Confirm corner handles appear over the image.
- Adjust the corners if the PR affects corner placement.
- Run Detect Position against the relevant detection environment.
- Confirm the resulting draft opens with the expected board size and stones.
- Confirm Show source image opens the image overlay from the draft when available.
- Create a blank draft separately.
- Confirm the blank draft does not show source-image controls.

## Local Data Export And Import

- Create at least one local game and one local draft.
- Open full Settings.
- Export local data.
- Confirm the downloaded JSON includes the expected games and drafts.
- Import the exported JSON into a clean browser profile or after clearing local records.
- Confirm the game and draft reappear on `/`.
- If the PR affects image drafts, include an image-created draft.
- Confirm export includes its image source and import restores Show source image.

## Share Flow

- Create a share from a recorded game or draft.
- Confirm the privacy confirmation dialog appears before the first share when it has not already been acknowledged.
- Open the privacy policy from the confirmation dialog.
- Confirm Back returns to the pending share flow with the Share tab still selected.
- Continue and create the share.
- Confirm creating the share blocks board edits and tab switching until the request finishes.
- Confirm copy-link feedback appears inside the Details panel.
- Open the generated `/shares/[slug]` page.
- Confirm the shared position is immutable from the viewer.
- Confirm captions, move labels, and controls match the task expectations.
- Edit the original game or draft after sharing.
- Confirm the post-share edit warning appears.
- Cancel the warning and confirm the board remains unchanged.
- Repeat the edit and continue.
- Confirm the edit applies and subsequent edits do not repeat the warning.

## SGF And Details Panel

- Open a recording board.
- Open Details.
- Confirm the SGF tab is available.
- Edit black and white player names.
- Change komi from Rules.
- Confirm changes auto-save without a Save button.
- Close and reopen Details.
- Confirm player names and komi persist.
- Swap players.
- Confirm only the player names swap and komi remains unchanged.
- Download SGF.
- Confirm the downloaded SGF includes the expected `PB`, `PW`, and `KM` values.
- Create a share and open the share page.
- Open Details on the share page.
- Confirm the SGF information panel shows names and komi, or placeholders when names are absent.
- Toggle Details closed and open again.

## Open Graph Preview

- Open the share preview route for a known share.
- Confirm board position, caption, and spacing match the live share behavior.
- Confirm the final shared position is shown when the task affects variation or replay state.

## Changelog And Copy

- Open `/changelog`.
- Confirm the new entry is present when the PR changes user-facing behavior.
- Confirm updated copy is consistent between live UI, share UI, and changelog text where relevant.
