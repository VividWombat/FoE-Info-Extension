# FoE-Info Extension — Developer Guide

## 1. Project Overview

FoE-Info is a Chrome DevTools panel extension for the browser game Forge of Empires (FoE). It works entirely inside Chrome's built-in DevTools: when you open DevTools on the FoE game tab, a "FoE-Info" panel appears alongside the usual Elements/Console/Network panels. The extension intercepts every HTTP response the game makes by listening on `chrome.devtools.network.onRequestFinished`. Each game API response is a JSON array of message objects; the extension parses them, identifies the `requestClass` and `requestMethod` fields, and routes each message to the appropriate handler module, which then renders information into the panel DOM.

The extension also maintains a persistent WebSocket connection to the game's real-time gateway (authenticated using a token obtained from `StartupService/getData`). WebSocket frames travel through the same handler pipeline as HTTP messages, so any handler that already works for polling responses works for push notifications too. A content script (`content.ts`) runs inside the game tab and renders an in-page HUD overlay showing live resource totals (coins, supplies, forge points, etc.) that the panel pushes to it via `browser.tabs.sendMessage`.

---

## 2. Prerequisites and Setup

**Required tools:**
- Node.js 18+ (LTS recommended)
- npm 9+
- Google Chrome (stable or dev channel)

**First-time setup:**

```bash
# Clone the repo
git clone https://github.com/FoE-Info/FoE-Info-Extension.git
cd FoE-Info-Extension

# Install dependencies
npm install
```

**Load the extension into Chrome:**
1. Run `npm run dev` to start webpack in watch mode. The output goes to `build/`.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and select the `build/` directory.
4. Open the FoE game tab, open Chrome DevTools, and find the **FoE-Info** panel.

Every time webpack rebuilds (on file save), click the reload icon on `chrome://extensions` — or press `Ctrl+R` inside DevTools — to pick up changes.

---

## 3. Architecture

### Data flow

```
Game browser tab (HTTPS)
        │
        │  Every /game/json?h= request (HTTP/2 JSON array)
        ▼
chrome.devtools.network.onRequestFinished   ← registered in index.ts
        │
        │  request.getContent() → raw body string
        ▼
safeJsonParse()  →  toRecordArray()
        │
        │  Array of { requestClass, requestMethod, responseData, … }
        ▼
handleRequestFinished()  in index.ts
        │
        │  else-if chain, one branch per handler module
        ▼
Handler module  (src/extension/services/*RequestHandler.ts)
        │  returns true  → message consumed
        │  returns false → falls through to next handler
        ▼
Service module  (src/extension/services/*Service.ts)
        │  reads showOptions flags, formats HTML
        ▼
DOM section div  (exported from index.ts, e.g. citystats, greatbuilding, guild)
        │
        ▼
Panel renders in DevTools

                          ┌──────────────────────────┐
Game real-time gateway ──►│  WebSocketService.ts      │
wss://{world}.foe.com     │  parseFrame()             │
                          │  handleWebSocketMessage() │──► same else-if chain
                          └──────────────────────────┘

Panel ──► browser.tabs.sendMessage ──► content.ts (HUD overlay in game tab)
```

### Directory map

| Path | Purpose |
|---|---|
| `src/extension/index.ts` | Entry point: creates all DOM section divs, wires `onRequestFinished`, owns the routing `else-if` chain |
| `src/extension/services/*RequestHandler.ts` | Handler modules — one per service domain; each exports a single function that returns `boolean` |
| `src/extension/services/*Service.ts` | Render/business-logic modules called by the handlers |
| `src/extension/services/WebSocketService.ts` | WebSocket lifecycle (connect, auth, parse, dispatch) |
| `src/extension/services/types.ts` | Shared TypeScript types (`HandlerMessage`, `MessageHandler`, etc.) |
| `src/extension/state/showOptions.ts` | 30+ exported boolean flags controlling which sections render |
| `src/extension/core/AddElement.ts` | HTML fragment helpers: `icon()`, `copy()`, `close()`, `post()` |
| `src/extension/core/collapse.ts` | Collapse state helpers (reads/writes `browser.storage.local`) |
| `src/extension/core/globals.ts` | Mutable panel-wide state: `toolOptions`, section height setters |
| `src/extension/core/storage.ts` | Thin wrapper around `browser.storage.local` |
| `src/extension/core/helper.ts` | Utility functions (resource name formatting, incidents display, etc.) |
| `src/css/main.scss` | Panel styles |
| `src/css/custom.scss` | CSS custom properties (theme tokens) + UI mode styles |
| `src/css/_preview-*.scss` | Per-view design-preview partials, scoped to `body[data-design-preview='true']` |
| `src/chrome/` | Manifests (MV3), HTML templates, icons |

---

## 4. How to Add a New Game Service Handler

This is the most common task. Use `MiscRequestHandler.ts` as a reference for small/miscellaneous services and `GreatBuildingsRequestHandler.ts` as a reference for complex ones.

**Step 1 — Create the handler file.**

Create `src/extension/services/MyNewRequestHandler.ts`:

```typescript
import { HandlerMessage } from './types';

// Describe every piece of state and DOM the handler touches as deps.
type MyNewDeps = {
  myNewSection: { innerHTML: string };
  showOptions: { showMyNew?: boolean };
};

export function handleMyNewRequest(
  msg: HandlerMessage,
  deps: MyNewDeps,
): boolean {
  // Return false immediately if this message isn't ours.
  if (msg.requestClass !== 'MyNewService') return false;

  const { myNewSection, showOptions } = deps;

  if (msg.requestMethod === 'getData') {
    if (!showOptions.showMyNew) return true; // handled but suppressed

    const data = msg.responseData as { items: string[] };
    myNewSection.innerHTML = data.items
      .map((item) => `<p>${item}</p>`)
      .join('');
    return true;
  }

  return false; // unknown method — let the chain continue
}
```

**Step 2 — Add a DOM section div in `index.ts`.**

Find the block where the existing section divs are created (around line 410) and add:

```typescript
export var myNewSection = document.createElement('div');
content.appendChild(myNewSection);
myNewSection.id = 'mynew';
```

**Step 3 — Import and wire the handler in `index.ts`.**

At the top of `index.ts`, add the import:

```typescript
import { handleMyNewRequest } from './services/MyNewRequestHandler';
```

Inside `handleRequestFinished`, add a branch to the `else-if` chain (before the final fall-through):

```typescript
} else if (handleMyNewRequest(msg, { myNewSection, showOptions })) {
  // handled in module
}
```

**Step 4 — Add an options toggle (optional — see Section 7).**

**Step 5 — Add a unit test.**

Create `tests/handlers/myNew.test.ts` following the pattern of existing handler tests. Run `npm run test:handlers` to verify.

---

## 5. How to Add a New Display Section

A "display section" is a `<div>` in the panel that a handler populates with HTML. The steps are a subset of Section 4:

1. **Declare the div** in `index.ts` in the section creation block. Give it a unique `id`.
2. **Export it** with `export var` so handler modules can receive it as a dependency.
3. **Pass it** to the relevant handler via the `deps` object in the routing call.
4. **Style it** in `src/css/main.scss` using the section `id` as a CSS selector. Prefer CSS custom properties from `custom.scss` over hard-coded colours.
5. **Conditionally show it** by reading the appropriate `showOptions` flag before writing `innerHTML`.

The panel renders sections in DOM order, so add the `content.appendChild()` call at the position you want the section to appear in the panel.

---

## 6. CSS / Theming System

### Custom properties (tokens)

All colours are defined as CSS custom properties in `src/css/custom.scss` under `:root`. Dark mode overrides are in `body[data-theme='dark']`. Always use tokens — never hard-coded hex values — so both themes stay consistent:

```scss
// Good
color: var(--foe-color-text-primary);
background: var(--foe-color-surface);
border-color: var(--foe-color-border);

// Avoid
color: #ffdcc0;
```

Key tokens:

| Token | Purpose |
|---|---|
| `--foe-color-background` | Page/panel background |
| `--foe-color-text-primary` | Body text |
| `--foe-color-surface` | Card / alert backgrounds |
| `--foe-color-border` | Borders and dividers |
| `--foe-color-title-bg` | Panel title bar gradient |
| `--foe-color-invest-good/fair/bad` | GB donation safety colours |

### UI modes

The body carries `data-ui-mode="classic"` or `data-ui-mode="traditional"` (set from stored preferences in `index.ts`). Use these selectors for mode-specific tweaks:

```scss
body.ui-mode-classic .my-element { font-family: 'Segoe UI', sans-serif; }
body.ui-mode-traditional .my-element { /* … */ }
```

### Design preview mode

When the **Design Preview** toggle is enabled in options, `index.ts` sets `body[data-design-preview="true"]`. Per-view SCSS partials in `src/css/_preview-*.scss` are imported into `main.scss` and scoped to this attribute. Use preview partials for experimental layout changes that should not affect normal users:

```scss
// src/css/_preview-mynew.scss
body[data-design-preview='true'] {
  #mynew {
    border-left: 3px solid var(--foe-primary-gold);
  }
}
```

Import the partial at the bottom of `src/css/main.scss`:

```scss
@use 'preview-mynew';
```

---

## 7. Options / Settings System

User-visible toggles are stored in `browser.storage.local` under the key `showOptions` and loaded at startup in `index.ts` via `receiveStorage()`.

**To add a new toggle:**

1. **Declare the flag** in `src/extension/state/showOptions.ts`:

```typescript
export var showMyNew = false; // default value
```

Add it to the `items` object at the bottom of the same file.

2. **Add the checkbox** to `src/chrome/options.html` inside the relevant `<fieldset>`.

3. **Wire it in `src/extension/options.ts`** inside `save_options()`:

```typescript
showOptions.showMyNew = (document.getElementById('myNew') as HTMLInputElement).checked;
```

And inside `restore_options()` (the function that re-populates the checkboxes from stored values):

```typescript
(document.getElementById('myNew') as HTMLInputElement).checked =
  items.showMyNew ?? false;
```

4. **Read the flag** in your handler module via the `showOptions` dep:

```typescript
if (!showOptions.showMyNew) return true; // handled, but user turned it off
```

---

## 8. Build, Dev, and Test Workflow

| Command | What it does |
|---|---|
| `npm run dev` | Webpack watch build (development mode, source maps on) → `build/` |
| `npm run build-foe-info` | Production bundle (minified, no source maps) → `build/` |
| `npm run typecheck` | TypeScript strict check with no emit — run before committing |
| `npm run test:handlers` | Vitest unit tests in `tests/handlers/` |
| `npm run format` | Prettier format all files |
| `npm run check` | Prettier check (CI-safe, no writes) |

**Recommended workflow for a change:**

```bash
npm run dev          # webpack watching in the background
# … edit files …
npm run typecheck    # catch type errors before loading in Chrome
npm run test:handlers
npm run format
```

After webpack rebuilds, reload the extension on `chrome://extensions` and press `Ctrl+R` inside the DevTools panel to refresh the panel page.

---

## 9. Common Pitfalls

**Handler returns `true` but does nothing visible.**
This is intentional for messages you want to silently consume (e.g. `TimerService/getTimers`). If you expected rendering, check that the `showOptions` flag is `true` and that the DOM element reference passed as a dep is the same object that is in the `content` div.

**`else-if` chain order matters.**
Handlers early in the chain shadow later ones. `handleMiscRequest` is a catch-all for many service classes; if your new service accidentally matches a condition inside it, your dedicated handler will never fire. Always put specific handlers before the `handleMiscRequest` call.

**The panel is a separate page context.**
`index.ts` runs inside `panel.html`, which is a DevTools page — not the game tab. You cannot access the game tab's `window` or DOM directly. Cross-tab communication goes through `browser.tabs.sendMessage` (panel → content script). The content script (`content.ts`) receives the message and writes to the in-page HUD.

**`request.getContent()` is asynchronous and one-shot.**
The DevTools network API delivers the response body only once. After `await request.getContent()` is consumed in `handleRequestFinished`, the data is gone. Do not call it a second time or cache the promise for later use.

**WebSocket frames share the same handler pipeline.**
`handleWebSocketMessage()` calls `handleMiscRequest` and a few other handlers directly. If your new handler is only wired in the HTTP path inside `handleRequestFinished`, it will not see WebSocket push messages. Add the equivalent call inside `handleWebSocketMessage` if the service also sends real-time updates.

**`showOptions` flags have two sources of truth.**
`src/extension/state/showOptions.ts` holds the in-panel runtime values; `src/extension/options.ts` holds a separate object for the options page. Both must be updated when adding a new flag, or the saved preference will not round-trip correctly.

**TypeScript strict mode is enforced.**
`tsc --noEmit` runs in strict mode. Avoid `any` casts where possible; use the `HandlerMessage` type from `src/extension/services/types.ts` as the base for your message types and extend it with narrower interfaces for each service's `responseData` shape.
