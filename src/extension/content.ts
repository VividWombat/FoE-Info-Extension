type HudGoodsEntry = { k: string; v: number };

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
  atkBonus?: number;
  defBonus?: number;
  arcBonus?: number;
  guildName?: string;
  bonusSpoils?: number;
  bonusDiplomatic?: number;
  bonusStrike?: number;
  bonusAid?: number;
  gbName?: string;
  gbLevel?: number;
  gbCurrent?: number;
  gbTotal?: number;
  wcLevel?: number;
  wcPoints?: number;
  wcThreshold?: number;
  goods?: HudGoodsEntry[];
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
  width: 244px;
  background: linear-gradient(180deg, #3d2710f5, #2a1a08f5);
  border: 1px solid #6b4820;
  border-top: 2px solid #cf9932;
  border-radius: 8px;
  padding: 10px 12px 8px;
  font-family: Georgia, 'Times New Roman', serif;
  color: #ecd9b4;
  box-shadow: 0 6px 20px rgba(0,0,0,0.65), inset 0 1px 0 rgba(207,153,50,0.12);
  user-select: none;
}
#foe-info-overlay.hidden { display: none; }
#foe-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(207,153,50,0.25);
  margin-bottom: 6px;
  padding-bottom: 5px;
  cursor: move;
}
#foe-info-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #f0bd55;
}
#foe-info-btns { display: flex; gap: 4px; }
.foe-info-btn {
  width: 22px; height: 22px;
  border-radius: 4px;
  border: 1px solid #5f4522;
  background: #1e160c;
  color: #f0bd55;
  font-weight: 700;
  cursor: pointer;
}
.foe-info-btn:hover { border-color: #f0bd55; color: #ffe2a5; }
#foe-info-body {
  max-height: 460px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #4b3518 transparent;
}
.foe-info-section { border-bottom: 1px solid rgba(207,153,50,0.15); }
.foe-info-section:last-of-type { border-bottom: none; }
.foe-info-sec-hdr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 0 3px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #cf9932;
}
.foe-info-sec-hdr:hover { color: #f0bd55; }
.foe-info-sec-hdr::after { content: '▾'; font-size: 9px; opacity: 0.7; }
.foe-info-sec-hdr.collapsed::after { content: '▸'; }
.foe-info-sec-body { padding-bottom: 3px; }
.foe-info-sec-body.collapsed { display: none; }
.foe-info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid rgba(207,153,50,0.1);
}
.foe-info-row:last-child { border-bottom: none; }
.foe-info-label { color: #9d8b6c; font-size: 11px; }
.foe-info-value { color: #f8dfab; font-size: 11px; font-weight: 700; }
.foe-info-muted { color: #9d8b6c; font-size: 10px; }
.foe-info-bar {
  height: 3px;
  background: rgba(207,153,50,0.22);
  border-radius: 2px;
  margin: 4px 0 2px;
  overflow: hidden;
}
.foe-info-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #6b8a4e, #cf9932);
  transition: width 0.4s ease;
}
#foe-info-player {
  padding: 5px 0 2px;
  border-top: 1px solid rgba(207,153,50,0.18);
  margin-top: 4px;
  font-size: 10px;
  color: #9d8b6c;
}
`;

const GOODS_LABELS: Record<string, string> = {
  noage: 'Stone Age', ba: 'Bronze Age', ia: 'Iron Age',
  ema: 'Early Middle Ages', hma: 'High Middle Ages', lma: 'Late Middle Ages',
  cma: 'Colonial Age', ina: 'Industrial Age', pe: 'Progressive Era',
  me: 'Modern Era', pme: 'Postmodern Era', ce: 'Contemporary Era',
  te: 'Tomorrow', fe: 'Future', af: 'Arctic Future',
  of: 'Oceanic Future', vf: 'Virtual Future',
  sam: 'SA Mars', saab: 'SA Asteroid Belt', sav: 'SA Venus',
  sajm: 'SA Jovian Moon', sat: 'SA Titan', sash: 'SA Saturn Hub',
};

const fmt = (value: unknown): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}K`;
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

const section = (id: string, title: string, bodyHtml: string, collapsed = false) => `
  <div class="foe-info-section" id="fi-wrap-${id}">
    <div class="foe-info-sec-hdr${collapsed ? ' collapsed' : ''}" data-sec="${id}">${title}</div>
    <div class="foe-info-sec-body${collapsed ? ' collapsed' : ''}" id="fi-body-${id}">${bodyHtml}</div>
  </div>`;

const row = (label: string, valueId: string) =>
  `<div class="foe-info-row"><span class="foe-info-label">${label}</span><span class="foe-info-value" id="${valueId}">-</span></div>`;

const barHtml = (fillId: string, captionId: string) =>
  `<div class="foe-info-bar"><div class="foe-info-bar-fill" id="${fillId}" style="width:0%"></div></div>
   <div class="foe-info-row"><span class="foe-info-muted" id="${captionId}">-</span></div>`;

const ensureOverlay = (): HTMLElement => {
  let overlay = document.getElementById(OVERLAY_ID) as HTMLElement | null;
  if (overlay) return overlay;

  ensureStyle();
  overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div id="foe-info-header">
      <span id="foe-info-title">FoE Info</span>
      <div id="foe-info-btns">
        <button class="foe-info-btn" id="fi-toggle" title="Minimize">\u2212</button>
        <button class="foe-info-btn" id="fi-hide" title="Hide">\u00d7</button>
      </div>
    </div>
    <div id="foe-info-body">
      ${section('res', 'Resources',
        row('Coins', 'fi-coins') +
        row('Supplies', 'fi-supplies') +
        row('FP', 'fi-fp') +
        row('Diamonds', 'fi-diamonds') +
        row('Medals', 'fi-medals') +
        row('Population', 'fi-pop')
      )}
      ${section('city', 'City',
        row('Era', 'fi-era') +
        row('Guild', 'fi-guild') +
        row('Attack', 'fi-atk') +
        row('Defense', 'fi-def') +
        row('Arc bonus', 'fi-arc')
      )}
      ${section('bonus', 'Bonuses',
        row('Spoils of War', 'fi-b-spoils') +
        row('Diplomatic Gift', 'fi-b-diplo') +
        row('First Strike', 'fi-b-strike') +
        row('Aid Goods', 'fi-b-aid'),
        true
      )}
      <div class="foe-info-section" id="fi-wrap-gb" style="display:none">
        <div class="foe-info-sec-hdr" data-sec="gb">Great Building</div>
        <div class="foe-info-sec-body" id="fi-body-gb">
          <div class="foe-info-row">
            <span class="foe-info-value" id="fi-gb-name" style="font-size:11px">-</span>
            <span class="foe-info-muted" id="fi-gb-level"></span>
          </div>
          ${barHtml('fi-gb-bar', 'fi-gb-progress')}
        </div>
      </div>
      <div class="foe-info-section" id="fi-wrap-wc" style="display:none">
        <div class="foe-info-sec-hdr" data-sec="wc">World Challenge</div>
        <div class="foe-info-sec-body" id="fi-body-wc">
          ${row('Level', 'fi-wc-level')}
          ${barHtml('fi-wc-bar', 'fi-wc-progress')}
        </div>
      </div>
      ${section('goods', 'Goods', '<div id="fi-goods-rows"></div>', true)}
      <div id="foe-info-player">Waiting for data\u2026</div>
    </div>`;

  // Accordion toggle
  overlay.querySelectorAll<HTMLElement>('.foe-info-sec-hdr').forEach((hdr) => {
    hdr.addEventListener('click', () => {
      const body = hdr.nextElementSibling as HTMLElement | null;
      hdr.classList.toggle('collapsed');
      body?.classList.toggle('collapsed');
    });
  });

  const body = overlay.querySelector('#foe-info-body') as HTMLElement;
  const toggleBtn = overlay.querySelector('#fi-toggle') as HTMLButtonElement;
  const hideBtn = overlay.querySelector('#fi-hide') as HTMLButtonElement;
  const header = overlay.querySelector('#foe-info-header') as HTMLElement;

  let minimized = false;
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    minimized = !minimized;
    body.style.display = minimized ? 'none' : '';
    toggleBtn.textContent = minimized ? '+' : '\u2212';
  });
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay?.classList.add('hidden');
  });

  makeDraggable(overlay, header);
  (document.body || document.documentElement).appendChild(overlay);
  return overlay;
};

const setBar = (fillId: string, captionId: string, current: number, total: number, unit = '') => {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  const fill = document.getElementById(fillId);
  if (fill) fill.style.width = `${pct}%`;
  setText(captionId, `${fmt(current)} / ${fmt(total)}${unit} (${pct}%)`);
};

const updateOverlay = (payload: HudPayload): void => {
  const overlay = ensureOverlay();
  overlay.classList.remove('hidden');

  // Resources
  setText('fi-coins', fmt(payload.coins));
  setText('fi-supplies', fmt(payload.supplies));
  setText('fi-fp', typeof payload.fpTotal === 'number' ? fmt(payload.fpTotal) : fmt(payload.fp));
  setText('fi-diamonds', fmt(payload.diamonds));
  setText('fi-medals', fmt(payload.medals));
  setText('fi-pop', fmt(payload.population));

  // City
  setText('fi-era', payload.era || '-');
  setText('fi-guild', payload.guildName || '-');
  setText('fi-atk', typeof payload.atkBonus === 'number' ? `+${payload.atkBonus}%` : '-');
  setText('fi-def', typeof payload.defBonus === 'number' ? `+${payload.defBonus}%` : '-');
  setText('fi-arc', typeof payload.arcBonus === 'number' ? `${payload.arcBonus}%` : '-');

  // Bonuses
  setText('fi-b-spoils', String(payload.bonusSpoils ?? 0));
  setText('fi-b-diplo', String(payload.bonusDiplomatic ?? 0));
  setText('fi-b-strike', String(payload.bonusStrike ?? 0));
  setText('fi-b-aid', String(payload.bonusAid ?? 0));

  // Great Building
  const gbWrap = document.getElementById('fi-wrap-gb');
  if (gbWrap) {
    const hasGb = !!payload.gbName;
    gbWrap.style.display = hasGb ? '' : 'none';
    if (hasGb) {
      setText('fi-gb-name', payload.gbName!);
      setText('fi-gb-level', `Lv ${payload.gbLevel ?? '?'}`);
      setBar('fi-gb-bar', 'fi-gb-progress', payload.gbCurrent ?? 0, payload.gbTotal ?? 1, ' FP');
    }
  }

  // World Challenge
  const wcWrap = document.getElementById('fi-wrap-wc');
  if (wcWrap) {
    const hasWc = typeof payload.wcLevel === 'number';
    wcWrap.style.display = hasWc ? '' : 'none';
    if (hasWc) {
      setText('fi-wc-level', String(payload.wcLevel));
      setBar('fi-wc-bar', 'fi-wc-progress', payload.wcPoints ?? 0, payload.wcThreshold ?? 1, ' pts');
    }
  }

  // Goods
  const goodsRows = document.getElementById('fi-goods-rows');
  if (goodsRows && payload.goods?.length) {
    goodsRows.innerHTML = payload.goods
      .map(({ k, v }) =>
        `<div class="foe-info-row"><span class="foe-info-label">${GOODS_LABELS[k] ?? k}</span><span class="foe-info-value">${fmt(v)}</span></div>`)
      .join('');
  }

  // Footer
  setText('foe-info-player',
    payload.playerName
      ? `${payload.playerName}${payload.world ? ` \u00b7 ${payload.world}` : ''}`
      : 'Connected to FoE Info');
};

const mergePayload = (current: HudPayload, incoming: HudPayload): HudPayload => {
  // Only apply fields that are explicitly set — undefined fields from the sniffer
  // (which only knows about resources) must not wipe DevTools-only fields.
  const patch = Object.fromEntries(
    Object.entries(incoming).filter(([, v]) => v !== undefined),
  ) as Partial<HudPayload>;
  return { ...current, ...patch };
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
