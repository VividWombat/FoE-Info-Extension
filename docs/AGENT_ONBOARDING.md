# Agent Onboarding: FoE-Info Chrome Extension

> Compact reference for AI coding agents. Read this before touching any code.

## What This Is

A Chrome DevTools panel extension for Forge of Empires. It intercepts the game's HTTP and WebSocket API traffic, parses JSON messages in `requestClass/requestMethod/responseData` format, and renders game stats in the DevTools panel. A separate content script injects an in-page HUD.

**Build command:** `npm run build-foe-info` (NOT `npm run build`)

---

## Codebase Map

| Path | Role |
|---|---|
| `src/extension/index.ts` | Orchestrator: DOM element declarations + message routing chain |
| `src/extension/services/*RequestHandler.ts` | Pure routing — decides which service handles a message |
| `src/extension/services/*Service.ts` | Rendering — writes innerHTML to DOM elements |
| `src/extension/core/` | Shared utilities: AddElement, collapse, copy, helper, globals, storage, post, constants |
| `src/extension/state/showOptions.ts` | Visibility flags per panel section |
| `src/extension/content.ts` | In-page HUD + XHR/fetch sniffer |
| `src/css/main.scss` | Panel styles — imports custom.scss |
| `src/css/options.scss` | Options page styles — imports custom.scss |
| `src/css/custom.scss` | Design tokens shared by both |
| `src/css/_preview-*.scss` | Preview mode partials, scoped to `body[data-design-preview='true']` |
| `src/chrome/manifest.json` | Extension manifest |
| `src/chrome/panel.html` | DevTools panel shell |
| `src/chrome/options.html` | Options page |

---

## Critical Invariants

1. **Routing chain location:** Message routing is a single `else-if` chain in `index.ts` around lines 960-1320. New handlers MUST be inserted BEFORE the final `else` block — never after it.

2. **Handler return contract:** Handler functions return `true` if they handled the message, `false` if not. The chain short-circuits on `true`. Every new handler must follow this contract.

3. **DOM element declarations:** Panel section elements are declared as `export var xxxDIV` at the top of `index.ts` (lines 406-500). Any new panel section requires a new exported var declared in that block — not inline, not in the service file.

4. **CSS scoping rules:** Panel styles go in `main.scss`; options styles go in `options.scss`; both import `custom.scss` for tokens. Preview-mode styles belong in a `_preview-xxx.scss` partial scoped to `body[data-design-preview='true'] #sectionId`.

5. **showOptions gating:** Before rendering any section, check the relevant flag in `src/extension/state/showOptions.ts`. Skipping this check causes sections to render when the user has hidden them.

6. **Pre-existing TypeScript errors:** `index.ts` and `options.ts` have known TS errors that do not block the build. Do not fix them unless explicitly asked. Do not let them distract you during a build — a successful `npm run build-foe-info` output is the ground truth.

7. **WebSocket token source:** The WS token is extracted from the `StartupService/getData` response. Look for `socketGatewayUrl` and `socketToken` fields in `responseData`. This is handled in `StartupRequestHandler.ts` via `onSocketParams`.

---

## Common Task Recipes

**Add a new message handler:**
1. Create `src/extension/services/XxxRequestHandler.ts` (returns `true`/`false`)
2. Create `src/extension/services/XxxService.ts` (does the rendering)
3. Import both in `index.ts`
4. Add `else if (requestClass === 'Xxx' && requestMethod === 'yyy') { ... }` in the routing chain, before the final `else`

**Add a new panel section:**
1. Declare `export var xxxDIV: HTMLElement` in the DOM declarations block of `index.ts` (lines ~406-500)
2. Instantiate the element in the DOM setup below the declarations
3. Pass `xxxDIV` to your service function
4. Gate rendering with the relevant `showOptions` flag

**Add a user option:**
1. Add the toggle to `src/chrome/options.html`
2. Wire save/restore in `options.ts`
3. Add the flag to `src/extension/state/showOptions.ts`
4. Read it in the handler or service before rendering

**Add a preview style:**
1. Create `src/css/_preview-xxx.scss`
2. Scope all rules to `body[data-design-preview='true'] #yourSectionId`
3. Import the partial from `main.scss`

---

## Current State (as of Phase 9)

- Phases 1-8 complete (core infrastructure, all major services, design preview system)
- Phase 9 (service expansion) in progress
- `WorldChallengeService` is wired and working
- `WebSocketService` is implemented
- `StartupRequestHandler.ts` handles `onSocketParams` to capture WS credentials
- `index.ts` has `worldchallengeDIV` declared and WS service wired
- `custom.scss` and `_preview-*.scss` partials were updated in Phase 8

**Recently changed files:**
- `src/extension/services/WorldChallengeRequestHandler.ts`
- `src/extension/services/WebSocketService.ts`
- `src/extension/services/StartupRequestHandler.ts`
- `src/extension/index.ts`
- `src/css/custom.scss`
- `src/css/_preview-*.scss`

---

## What NOT To Do

- Do not run `npm run build` — it builds the wrong target. Always use `npm run build-foe-info`.
- Do not add a new routing `else-if` after the final `else` block — it will never execute.
- Do not declare DOM element vars inside service files or inline in setup code — they belong in the exported block at the top of `index.ts`.
- Do not render a section without checking `showOptions` first.
- Do not attempt to fix the pre-existing TS errors in `index.ts` / `options.ts` unless the task explicitly calls for it.
- Do not add panel CSS to `options.scss` or options CSS to `main.scss` — they are separate entry points.
- Do not scope preview styles globally — they must be under `body[data-design-preview='true']`.
