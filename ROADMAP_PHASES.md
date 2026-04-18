# FoE-Info Refactor Roadmap (Phased)

This roadmap re-establishes the full multi-phase plan, including the product phases that are not part of the TypeScript-only track.

## Phase 1: Handler Extraction and Stabilization (Completed)

Goals:

- Extract request handling into dedicated handler modules.
- Keep behavior parity with existing extension flow.

Done:

- Request handlers split and wired.
- Regression tests introduced for core handler paths.

## Phase 2: TypeScript Migration and Strictness (Completed)

Goals:

- Migrate JS modules to TS.
- Remove all `@ts-nocheck` usage.
- Resolve strict type errors.

Done:

- All `src/js` migration commits completed.
- `@ts-nocheck` removed from migrated files.
- Type-hardening pass performed on handlers.

## Phase 3: Styling Update (Completed)

Goals:

- Refresh extension UI consistency across panel, popup, options, and devtools.
- Consolidate theme tokens and remove ad-hoc color/style duplication.
- Preserve existing UX behavior while improving clarity and density.

Scope:

- `src/css/_variables.scss`
- `src/css/main.scss`
- `src/css/custom.scss`
- `src/css/options.scss`
- `src/chrome/panel.html`, `src/chrome/popup.html`, `src/chrome/options.html`

Deliverables:

- Unified token palette (semantic color and spacing variables).
- Reduced inline styling in HTML templates.
- Updated component-level classes for alerts, tables, controls, and icon actions.
- Visual smoke-check in dev build.

Commit slices:

1. Token and variable cleanup.
2. Panel styling pass.
3. Popup + options styling pass.
4. Final polish and cleanup.

## Phase 4: Merge FoE-Extension Stream (Planned)

Goals:

- Merge upstream/target FoE extension changes with minimal regressions.
- Resolve code and style conflicts using the Phase 3 baseline.

Inputs required:

- Source branch or repository reference for the merge target.
- Merge strategy decision (single merge commit vs staged cherry-pick batches).

Deliverables:

- Conflict resolution notes.
- Post-merge verification checklist.
- Follow-up fix commits grouped by feature area.

Status:

- Completed. The branch was already up to date with origin/development at merge time.

## Phase 5: Documentation Update (Completed)

Goals:

- Bring project documentation in sync with new architecture and workflow.

Scope:

- `README.md`
- Add architecture notes for request handlers and message flow.
- Add migration notes (TS, testing, and known assumptions).
- Add contributor workflow guidance (build, test, release).

Deliverables:

- Updated setup/build/test sections.
- Handler map and data-flow summary.
- Changelog-style migration summary.

Status:

- Completed. README and architecture documentation were updated.

## Phase 6: Security/Permissions and Release Readiness (In Progress)

Goals:

- Execute staged permission audit safely.
- Prepare release candidate with reproducible checks.

Scope:

- `PERMISSIONS_AUDIT.md`
- Source manifests under `src/chrome/`.

Deliverables:

- One commit per permission stage (reversible).
- Smoke test evidence for each permission reduction.
- Final release checklist.

Status:

- Stage 1 completed (legacy discordapp permission removed).
- Stage 2a completed: `*.googleusercontent.com` removed — confirmed unused in source.
- Stage 2b completed: `*.google.com/*` narrowed to `script.google.com/macros/s/*`;
  options page now validates URL format before saving.
- Stage 3 closed (no change): `webRequest` is actively required for CDN header stripping
  at index.ts; permission retained.

## Phase 7: QA and Release (Completed)

Goals:

- Final validation across feature flows and browser targets.

Deliverables:

- Type-check, test, and manual smoke-test pass.
- Tagged release candidate branch and notes.

Status:

- Completed validation sweep (typecheck/tests/build path).

## Phase 8: Design Preview System (Planned)

Goals:

- Surface the Chronicler design system mockups as an opt-in "Preview" mode alongside the
  existing classic/traditional UI, so users can test and compare without losing the original.
- Restyle the Options page to use the Chronicler design tokens.

Scope:

- `src/css/custom.scss` — convert Tailwind-CDN mockup styles to SCSS tokens (no CDN dependency).
- `src/chrome/options.html` + `src/css/options.scss` — Options page redesign.
- `src/chrome/panel.html` + `src/extension/index.ts` — conditional rendering flag (`designPreview`).
- New SCSS partials per panel view (empire dashboard, GB tracker, guild expedition hub, trade goods).
- Options settings: add `designPreview` boolean flag persisted to storage.

Approach:

- Option B: separate `designPreview` toggle in Options (not a third `uiMode` value).
- New panel layouts render when flag is enabled; original layouts are the default.
- No Tailwind CDN — styles are ported to the existing SCSS token system.

Deliverables:

- Options page redesign commit.
- Per-panel preview layout commits (one per view for easy rollback).
- Integration test: both layout modes load without JS errors.

Status: Planned.

## Phase 9: Service Expansion (Planned)

Goals:

- Wire up game services identified from HAR analysis that are not currently captured.
- Implement WebSocket/WebStream listener if a streaming endpoint is confirmed.

Scope:

- New or expanded handlers in `src/extension/index.ts`.
- New service modules under `src/extension/services/` as needed.

Status: Pending HAR analysis results.

## Current Position

- Completed: Phases 1-7. Phase 6 fully closed.
- Next: Phase 8 (design preview + options redesign), then Phase 9 (service expansion).
