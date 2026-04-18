# Permissions Audit (Reversible Plan)

This document tracks current permissions and proposes staged, reversible changes.

## Scope

- Current source manifests:
  - src/chrome/manifest.json
  - src/chrome/manifest_release.json
  - src/chrome/manifest_firefox.json
- Current build target: Chrome first.

## Current Baseline (After Stage 2b)

### permissions

- storage
- unlimitedStorage
- clipboardWrite
- webRequest
- tabs

### host_permissions

- https://*.forgeofempires.com/game/*
- https://script.google.com/macros/s/*
- https://discord.com/api/webhooks/*
- https://*.innogamescdn.com/*

## Proposed Staged Changes

Stage 1 is complete. Use the remaining sequence for future milestones.

### Stage 1: Remove legacy Discord domain if telemetry confirms no usage (Completed)

- Candidate removal:
  - host_permissions: https://discordapp.com/api/webhooks/*
- Reason:
  - Legacy domain; modern webhook endpoint is discord.com.
- Validation performed:
  - Runtime webhook defaults and examples in source were migrated to discord.com.
  - Source manifests no longer include discordapp.com host permissions.
  - Handler regression tests and type checks passed after change.
- Rollback:
  - Re-add exact host pattern in all source manifests.

### Stage 2a: Remove unused googleusercontent host permission (Completed)

- Removed:
  - `host_permissions`: `https://*.googleusercontent.com/`
- Reason:
  - No source file in `src/` references this host pattern.
  - No Google user content (avatars, Drive files) is fetched by any handler.
- Validation performed:
  - Full grep of `src/` for `googleusercontent` found zero references outside manifests.
  - Pattern was present since project origin; no feature was ever wired to it.
- Rollback:
  - Re-add `"https://*.googleusercontent.com/"` to `host_permissions` in all three source manifests.

### Stage 2b: Narrow *.google.com/* → script.google.com/macros/s/* (Completed)

- Narrowed:
  - `host_permissions`: `https://*.google.com/*` → `https://script.google.com/macros/s/*`
- Reason:
  - The only Google endpoint is the user-configured Apps Script webhook URL.
  - All code paths use `script.google.com/macros/s/*/exec` exclusively.
- Validation performed:
  - Added `APPS_SCRIPT_RE` validation in `options.ts` `save_options()` — rejects and warns
    if the entered URL does not match `https://script.google.com/macros/s/*/exec`.
  - Updated `pattern` attribute in `options.html` to enforce the same format in-browser.
  - No other Google host endpoints exist in source.
- Rollback:
  - Revert manifest change to `https://*.google.com/*` in all source manifests.
  - Remove the `APPS_SCRIPT_RE` guard and `pattern` attribute change in options.

### Stage 3: webRequest permission — Confirmed Required (Closed)

- Candidate removal: `permissions: webRequest`
- Validation finding:
  - `chrome.webRequest.onBeforeSendHeaders.addListener` is called in `src/extension/index.ts:870`.
  - It strips the extension origin header from requests to `https://*.innogamescdn.com/*`
    to prevent leaking the extension ID to the game CDN.
  - This is an active, load-bearing use of the blocking webRequest API.
- Decision: webRequest permission must remain. Stage 3 is closed with no change.

## Change Control Rules

- Apply permission updates in one dedicated commit per stage.
- Keep manifest.json, manifest_release.json, and manifest_firefox.json in sync unless a browser-specific exception is intentional and documented.
- Include explicit rollback notes in each PR description.
- If any smoke test fails, revert only the permission commit for that stage.
