type HudPayload = {
  playerName?: string;
  world?: string;
  era?: string;
  coins?: number | null;
  supplies?: number | null;
  fp?: number | null;
  fpTotal?: number | null;
  diamonds?: number | null;
  medals?: number | null;
  population?: number | null;
};

const OVERLAY_ID = 'foe-info-overlay';
const SNIFFER_EVENT = '__foeInfoHudUpdate';
const SNIFFER_SCRIPT_ID = 'foe-info-hud-sniffer';
const FRAME_FORWARD_EVENT = 'foe-info-hud:frame-update';
const isTopFrame = window.top === window;

const OVERLAY_STYLE = `
#foe-info-overlay {
  position: fixed;
  top: 84px;
  right: 16px;
  z-index: 2147483640;
  width: 230px;
  background: linear-gradient(180deg, #191007f2, #0e0a08f5);
  border: 1px solid #4b3518;
  border-top: 2px solid #cf9932;
  border-radius: 8px;
  padding: 10px 12px 8px;
  font-family: Georgia, 'Times New Roman', serif;
  color: #ecd9b4;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.82);
  user-select: none;
}
#foe-info-overlay.hidden {
  display: none;
}
#foe-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(207, 153, 50, 0.25);
  margin-bottom: 8px;
  padding-bottom: 6px;
  cursor: move;
}
#foe-info-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f0bd55;
}
#foe-info-btns {
  display: flex;
  gap: 4px;
}
.foe-info-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid #5f4522;
  background: #1e160c;
  color: #f0bd55;
  font-weight: 700;
  cursor: pointer;
}
.foe-info-btn:hover {
  border-color: #f0bd55;
  color: #ffe2a5;
}
#foe-info-body {
  display: block;
}
.foe-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
  border-bottom: 1px solid rgba(207, 153, 50, 0.14);
}
.foe-info-row:last-child {
  border-bottom: none;
}
.foe-info-label {
  color: #9d8b6c;
  font-size: 12px;
}
.foe-info-value {
  color: #f8dfab;
  font-size: 12px;
  font-weight: 700;
}
#foe-info-player {
  margin-top: 7px;
  padding-top: 6px;
  border-top: 1px solid rgba(207, 153, 50, 0.2);
  font-size: 11px;
  color: #d4c7ab;
}
`;

const fmt = (value: unknown): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
};

const setText = (id: string, value: string) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
};

const ensureStyle = () => {
  if (document.getElementById('foe-info-overlay-style')) return;
  const style = document.createElement('style');
  style.id = 'foe-info-overlay-style';
  style.textContent = OVERLAY_STYLE;
  document.documentElement.appendChild(style);
};

const makeDraggable = (overlay: HTMLElement, dragHandle: HTMLElement) => {
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  dragHandle.addEventListener('mousedown', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    dragging = true;
    const rect = overlay.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    event.preventDefault();
  });

  document.addEventListener('mousemove', (event) => {
    if (!dragging) return;
    overlay.style.left = `${event.clientX - offsetX}px`;
    overlay.style.top = `${event.clientY - offsetY}px`;
    overlay.style.right = 'auto';
  });

  document.addEventListener('mouseup', () => {
    dragging = false;
  });
};

const ensureOverlay = () => {
  let overlay = document.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (overlay) return overlay;

  ensureStyle();

  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div id="foe-info-header">
      <span id="foe-info-title">FoE Info HUD</span>
      <div id="foe-info-btns">
        <button class="foe-info-btn" id="foe-info-toggle" title="Minimize">-</button>
        <button class="foe-info-btn" id="foe-info-hide" title="Hide">x</button>
      </div>
    </div>
    <div id="foe-info-body">
      <div class="foe-info-row"><span class="foe-info-label">Coins</span><span class="foe-info-value" id="foe-info-coins">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">Supplies</span><span class="foe-info-value" id="foe-info-supplies">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">FP</span><span class="foe-info-value" id="foe-info-fp">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">Diamonds</span><span class="foe-info-value" id="foe-info-diamonds">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">Medals</span><span class="foe-info-value" id="foe-info-medals">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">Population</span><span class="foe-info-value" id="foe-info-population">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">World</span><span class="foe-info-value" id="foe-info-world">-</span></div>
      <div class="foe-info-row"><span class="foe-info-label">Era</span><span class="foe-info-value" id="foe-info-era">-</span></div>
      <div id="foe-info-player">Waiting for FoE Info data...</div>
    </div>
  `;

  const mountTarget = document.body || document.documentElement;
  mountTarget.appendChild(overlay);

  const body = overlay.querySelector('#foe-info-body') as HTMLElement;
  const toggleButton = overlay.querySelector('#foe-info-toggle') as HTMLButtonElement;
  const hideButton = overlay.querySelector('#foe-info-hide') as HTMLButtonElement;
  const header = overlay.querySelector('#foe-info-header') as HTMLElement;

  let minimized = false;
  toggleButton.addEventListener('click', (event) => {
    event.stopPropagation();
    minimized = !minimized;
    body.style.display = minimized ? 'none' : '';
    toggleButton.textContent = minimized ? '+' : '-';
  });

  hideButton.addEventListener('click', (event) => {
    event.stopPropagation();
    overlay?.classList.add('hidden');
  });

  makeDraggable(overlay, header);

  return overlay;
};

const updateOverlay = (payload: HudPayload) => {
  const overlay = ensureOverlay();
  overlay.classList.remove('hidden');

  setText('foe-info-coins', fmt(payload.coins));
  setText('foe-info-supplies', fmt(payload.supplies));
  if (typeof payload.fpTotal === 'number') {
    setText('foe-info-fp', fmt(payload.fpTotal));
  } else {
    setText('foe-info-fp', fmt(payload.fp));
  }
  setText('foe-info-diamonds', fmt(payload.diamonds));
  setText('foe-info-medals', fmt(payload.medals));
  setText('foe-info-population', fmt(payload.population));
  setText('foe-info-world', payload.world || '-');
  setText('foe-info-era', payload.era || '-');

  const playerLine = payload.playerName
    ? `${payload.playerName}${payload.world ? ` - ${payload.world}` : ''}`
    : 'Connected to FoE Info';
  setText('foe-info-player', playerLine);
};

const mergePayload = (
  current: HudPayload,
  incoming: HudPayload,
): HudPayload => {
  return {
    ...current,
    ...incoming,
    fpTotal:
      typeof incoming.fpTotal === 'number' ? incoming.fpTotal : current.fpTotal,
  };
};

const installInPageSniffer = () => {
  if (document.getElementById(SNIFFER_SCRIPT_ID)) {
    return;
  }

  const injected = document.createElement('script');
  injected.id = SNIFFER_SCRIPT_ID;
  injected.textContent = `
(() => {
  if (window.__foeInfoHudSnifferInstalled) return;
  window.__foeInfoHudSnifferInstalled = true;

  const EVENT_NAME = '${SNIFFER_EVENT}';
  const state = {
    coins: null,
    supplies: null,
    fp: null,
    fpTotal: null,
    diamonds: null,
    medals: null,
    population: null,
    playerName: null,
    era: null,
  };

  const emit = (patch) => {
    if (!patch || typeof patch !== 'object') return;
    Object.assign(state, patch);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { ...state } }));
  };

  const num = (value) => {
    if (value == null) return null;
    const asNumber = Number(value);
    return Number.isNaN(asNumber) ? null : asNumber;
  };

  const pick = (obj, keys) => {
    if (!obj || typeof obj !== 'object') return null;
    for (const key of keys) {
      const value = num(obj[key]);
      if (value != null) return value;

      const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      const camelValue = num(obj[camel]);
      if (camelValue != null) return camelValue;
    }
    return null;
  };

  const collectPatch = (payload, out, depth = 0) => {
    if (!payload || typeof payload !== 'object' || depth > 8) return;

    if (Array.isArray(payload)) {
      for (const item of payload) {
        collectPatch(item, out, depth + 1);
      }
      return;
    }

    const coins = pick(payload, ['money', 'coins', 'coin']);
    const supplies = pick(payload, ['supplies', 'supply']);
    const diamonds = pick(payload, ['premium', 'diamonds', 'diamond']);
    const medals = pick(payload, ['medals', 'medal']);
    const population = pick(payload, ['population', 'citizens', 'pop']);

    if (coins != null) out.coins = coins;
    if (supplies != null) out.supplies = supplies;
    if (diamonds != null) out.diamonds = diamonds;
    if (medals != null) out.medals = medals;
    if (population != null) out.population = population;

    const fpCurrent = pick(payload, ['forge_points', 'forgePoints', 'amount', 'current', 'fp']);
    const fpMax = pick(payload, ['strategy_points', 'max', 'maximum', 'fpMax', 'max_amount']);
    if (fpCurrent != null) out.fp = fpCurrent;
    if (fpCurrent != null && fpMax != null) out.fpTotal = fpCurrent + fpMax;
    else if (fpCurrent != null) out.fpTotal = fpCurrent;

    if (typeof payload.player_name === 'string') out.playerName = payload.player_name;
    if (typeof payload.name === 'string' && !out.playerName) out.playerName = payload.name;
    if (typeof payload.world === 'string') out.world = payload.world;
    if (typeof payload.era === 'string') out.era = payload.era;

    for (const key of Object.keys(payload)) {
      const value = payload[key];
      if (value && typeof value === 'object') {
        collectPatch(value, out, depth + 1);
      }
    }
  };

  const parseBody = (requestUrl, responseText) => {
    if (!requestUrl || !requestUrl.includes('forgeofempires.com')) return;
    if (!responseText || typeof responseText !== 'string') return;

    let parsed;
    try {
      parsed = JSON.parse(responseText);
    } catch (_error) {
      return;
    }

    const messages = Array.isArray(parsed) ? parsed : [parsed];
    const patch = {};

    for (const message of messages) {
      if (!message || typeof message !== 'object') continue;
      const responseData =
        message.responseData ?? message.data ?? message.result ?? message;
      collectPatch(responseData, patch, 0);

      // Also scan message envelope because some values are present outside responseData.
      collectPatch(message, patch, 0);
    }

    if (Object.keys(patch).length > 0) {
      emit(patch);
    }
  };

  const scanRuntime = () => {
    const patch = {};
    try {
      const candidates = [window.forge, window.game, window.FoE, window.client].filter(Boolean);
      for (const root of candidates) {
        collectPatch(root, patch, 0);
      }
    } catch (_error) {
      // ignore scan errors
    }

    if (Object.keys(patch).length > 0) {
      emit(patch);
    }
  };

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, requestUrl) {
    this.__foeInfoUrl = typeof requestUrl === 'string' ? requestUrl : '';
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    this.addEventListener('load', () => {
      try {
        if (this.status >= 200 && this.status < 300) {
          parseBody(this.__foeInfoUrl || '', this.responseText || '');
        }
      } catch (_error) {
        // ignore parsing errors
      }
    });
    return originalSend.apply(this, arguments);
  };

  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const requestUrl =
      typeof input === 'string' ? input : (input && input.url) || '';
    return originalFetch.call(window, input, init).then((response) => {
      try {
        response
          .clone()
          .text()
          .then((text) => parseBody(requestUrl, text))
          .catch(() => undefined);
      } catch (_error) {
        // ignore parsing errors
      }
      return response;
    });
  };

  setTimeout(scanRuntime, 3000);
  setInterval(scanRuntime, 10000);
})();
`;

  const mountPoint = document.head || document.documentElement || document.body;
  mountPoint?.appendChild(injected);
};

const snifferState: HudPayload = {};

const onSnifferUpdate = (event: Event) => {
  const detail = (event as CustomEvent<HudPayload>).detail;
  if (!detail || typeof detail !== 'object') {
    return;
  }

  Object.assign(snifferState, mergePayload(snifferState, detail));
  updateOverlay(snifferState);

  try {
    window.top?.postMessage(
      {
        type: FRAME_FORWARD_EVENT,
        payload: detail,
      },
      '*',
    );
  } catch (_error) {
    // Ignore cross-frame delivery issues.
  }
};

const onFrameForward = (event: MessageEvent) => {
  if (!isTopFrame) {
    return;
  }

  const data = event.data;
  if (!data || data.type !== FRAME_FORWARD_EVENT || !data.payload) {
    return;
  }

  Object.assign(
    snifferState,
    mergePayload(snifferState, data.payload as HudPayload),
  );
  updateOverlay(snifferState);
};

const init = () => {
  ensureOverlay();
  window.addEventListener(SNIFFER_EVENT, onSnifferUpdate);
  window.addEventListener('message', onFrameForward);
};

// Initialise only when the user has opted in (default: off).
chrome.storage.local.get('tool', (result: any) => {
  if (!result?.tool?.showHud) return;

  installInPageSniffer();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (chrome.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((message: any) => {
      if (message?.type === 'foe-info-hud:update') {
        Object.assign(
          snifferState,
          mergePayload(snifferState, (message.payload || {}) as HudPayload),
        );
        updateOverlay(snifferState);
      }
    });
  }
});
