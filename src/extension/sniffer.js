// In-page XHR/fetch sniffer injected by content.ts as a web_accessible_resource.
// Runs in the page's JS context (bypasses page CSP) and dispatches
// '__foeInfoHudUpdate' custom events with resource data whenever the game
// makes API calls to forgeofempires.com.
(() => {
  if (window.__foeInfoHudSnifferInstalled) return;
  window.__foeInfoHudSnifferInstalled = true;

  const EVENT_NAME = '__foeInfoHudUpdate';

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
    arcBonus: 90,
  };

  // Persistent context for GB donation calculations across API calls.
  const gbCtx = {
    total: 0,
    current: 0,
    visitedPlayerName: null,
  };

  // Static GB entity-ID → display name map (mirrors helper.fGBname fallbacks).
  const GB_NAME = {
    X_AllAge_EasterBonus4: 'Observatory',
    X_AllAge_Expedition: 'Temple of Relics',
    X_AllAge_Oracle: 'Oracle of Delphi',
    X_AllAge_Galata: 'Galata Tower',
    X_BronzeAge_Landmark1: 'Tower of Babel',
    X_BronzeAge_Landmark2: 'Statue of Zeus',
    X_IronAge_Landmark1: 'Colosseum',
    X_IronAge_Landmark2: 'Lighthouse of Alexandria',
    X_EarlyMiddleAge_Landmark1: 'Hagia Sophia',
    X_EarlyMiddleAge_Landmark2: 'Cathedral of Aachen',
    X_EarlyMiddleAge_Landmark3: 'Galata Tower',
    X_HighMiddleAge_Landmark1: "St. Mark's Basilica",
    X_HighMiddleAge_Landmark3: 'Notre Dame',
    X_LateMiddleAge_Landmark1: "St. Basil's Cathedral",
    X_LateMiddleAge_Landmark3: 'Castel del Monte',
    X_ColonialAge_Landmark1: 'Frauenkirche of Dresden',
    X_ColonialAge_Landmark2: 'Deal Castle',
    X_IndustrialAge_Landmark1: 'Royal Albert Hall',
    X_IndustrialAge_Landmark2: 'Capitol',
    X_ProgressiveEra_Landmark1: 'Alcatraz',
    X_ProgressiveEra_Landmark2: 'Ch\u00e2teau Frontenac',
    X_ModernEra_Landmark1: 'Space Needle',
    X_ModernEra_Landmark2: 'Atomium',
    X_PostModernEra_Landmark1: 'Cape Canaveral',
    X_PostModernEra_Landmark2: 'The Habitat',
    X_ContemporaryEra_Landmark1: 'Lotus Temple',
    X_ContemporaryEra_Landmark2: 'Innovation Tower',
    X_TomorrowEra_Landmark1: 'Voyager V1',
    X_TomorrowEra_Landmark2: 'Truce Tower',
    X_FutureEra_Landmark1: 'The Arc',
    X_FutureEra_Landmark2: 'Rain Forest Project',
    X_FutureEra_Landmark3: 'Cosmic Catalyst (Future)',
    X_ArcticFuture_Landmark1: 'Gaea Statue',
    X_ArcticFuture_Landmark2: 'Arctic Orangery',
    X_ArcticFuture_Landmark3: 'Seed Vault',
    X_OceanicFuture_Landmark1: 'Atlantis Museum',
    X_OceanicFuture_Landmark2: 'The Kraken',
    X_OceanicFuture_Landmark3: 'The Blue Galaxy',
    X_VirtualFuture_Landmark1: 'Terracotta Army',
    X_VirtualFuture_Landmark2: 'Himeji Castle',
    X_SpaceAgeMars_Landmark1: 'Star Gazer',
    X_SpaceAgeMars_Landmark2: 'The Virgo Project',
    X_SpaceAgeAsteroidBelt_Landmark1: 'Space Carrier',
    X_SpaceAgeVenus_Landmark1: 'Flying Island',
    X_SpaceAgeJupiterMoon_Landmark1: 'A.I. Core',
    X_SpaceAgeTitan_Landmark1: 'Saturn VI Gate CENTAURUS',
    X_SpaceAgeTitan_Landmark2: 'Saturn VI Gate PEGASUS',
    X_SpaceAgeTitan_Landmark3: 'Saturn VI Gate HYDRA',
    X_SpaceAgeSpaceHub_Landmark1: 'Stellar Warship',
    X_SpaceAgeSpaceHub_Landmark2: 'Cosmic Catalyst',
  };

  const gbNameOf = (entityId) => (entityId && (GB_NAME[entityId] || entityId)) || null;

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

  const collectPatch = (payload, out, depth) => {
    if (!payload || typeof payload !== 'object' || depth > 8) return;

    if (Array.isArray(payload)) {
      for (const item of payload) {
        collectPatch(item, out, depth + 1);
      }
      return;
    }

    // Only extract fields that are specific enough to not cause false positives.
    // Resources and playerName are extracted from known API paths only — NOT here.
    if (typeof payload.world === 'string') out.world = payload.world;

    // Arc bonus from city map entity bonus objects.
    if (typeof payload.type === 'string' && payload.type === 'contribution_boost' && num(payload.value) != null) {
      out.arcBonus = num(payload.value);
      state.arcBonus = out.arcBonus;
    }

    // Limited bonuses from CityService.getLimitedBonuses array entries.
    if (typeof payload.type === 'string' && num(payload.amount) != null) {
      if (payload.type === 'spoils_of_war') out.bonusSpoils = num(payload.amount);
      else if (payload.type === 'diplomatic_gifts') out.bonusDiplomatic = num(payload.amount);
      else if (payload.type === 'first_strike') out.bonusStrike = num(payload.amount);
      else if (payload.type === 'aid_goods') out.bonusAid = num(payload.amount);
    }

    for (const key of Object.keys(payload)) {
      const value = payload[key];
      if (value && typeof value === 'object') {
        collectPatch(value, out, depth + 1);
      }
    }
  };

  // Extract GB spot data (lock / profit / BE) from a rankings array.
  const extractGbSpot = (rankings, patch) => {
    const total = gbCtx.total;
    const current = gbCtx.current;
    if (total <= 0) return;

    const remaining = total - current;
    const top = [0, 0, 0, 0, 0, 0];
    const rewards = [0, 0, 0, 0, 0];

    for (const r of rankings) {
      if (!r || typeof r !== 'object') continue;
      const rank = r.rank;
      if (rank > 0 && rank < 6) {
        top[rank - 1] = r.forge_points || 0;
        rewards[rank - 1] = r.reward?.strategy_point_amount || 0;
      } else if (rank === 6) {
        top[5] = r.forge_points || 0;
      }
    }

    for (let place = 1; place <= 5; place++) {
      const i = place - 1;
      if (rewards[i] <= 0) continue;
      const lock = Math.round((remaining + top[i]) / 2);
      if (lock < remaining) {
        const be = Math.round(rewards[i] * (1 + state.arcBonus / 100));
        const profit = be - lock;
        const custom = Math.round(rewards[i] * 1.9);
        patch.gbPlace = place;
        patch.gbOwner = gbCtx.visitedPlayerName || state.playerName || '';
        patch.gbLock = lock;
        patch.gbProfit = profit;
        patch.gbBe = be;
        patch.gbCustom = custom;
        patch.gbCustomPct = 1.9;
        break;
      }
    }
  };

  // Apply a player resource bag { money, supplies, premium, medals, population, strategy_points }.
  const applyResourceBag = (bag, patch) => {
    if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return;
    const money = num(bag.money);
    const supplies = num(bag.supplies);
    const premium = num(bag.premium);
    const medals = num(bag.medals);
    const population = num(bag.population);
    const fp = num(bag.strategy_points);
    const fpMax = num(bag.strategy_points_max);
    if (money != null) patch.coins = money;
    if (supplies != null) patch.supplies = supplies;
    if (premium != null) patch.diamonds = premium;
    if (medals != null) patch.medals = medals;
    if (population != null) patch.population = population;
    if (fp != null) {
      patch.fp = fp;
      patch.fpTotal = fp + (fpMax ?? 0);
    }
  };

  // Parse structured FoE API messages (arrays of {requestClass, requestMethod, responseData}).
  const processApiMessage = (message, patch) => {
    const cls = message.requestClass;
    const method = message.requestMethod;
    const data = message.responseData;
    if (!cls || !method) return;

    // StartupService/getData: player name, era, and initial resource bag.
    if (cls === 'StartupService' && method === 'getData') {
      const userData = data?.user_data;
      if (userData) {
        if (typeof userData.user_name === 'string') patch.playerName = userData.user_name;
        if (typeof userData.era === 'string') patch.era = userData.era;
        if (userData.resources) applyResourceBag(userData.resources, patch);
      }
    }

    // Extract resource bag from known response paths used by ResourceService and
    // action responses that return updated player resources.
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const outerBag = data.resources;
      if (outerBag && typeof outerBag === 'object' && !Array.isArray(outerBag)) {
        if (outerBag.resources && typeof outerBag.resources === 'object') {
          // Double-nested: ResourceService/getPlayerResourceBag
          applyResourceBag(outerBag.resources, patch);
        } else if (outerBag.money != null || outerBag.strategy_points != null) {
          // Direct bag: ResourceService/getPlayerResources and action responses
          applyResourceBag(outerBag, patch);
        }
      }
    }

    // Visiting another player's city: capture their name so GB owner row shows correctly.
    if (cls === 'OtherPlayerService' && method === 'visitPlayer') {
      const name = typeof data?.other_player?.name === 'string' ? data.other_player.name : null;
      if (name) gbCtx.visitedPlayerName = name;
    }

    // Foreign city GB: fires when player clicks a GB in another player's city.
    if (cls === 'OtherPlayerService' && method === 'getOtherPlayerCityMapEntity') {
      const entityId = data?.cityentity_id;
      const total = num(data?.state?.forge_points_for_level_up);
      const current = num(data?.state?.invested_forge_points) ?? 0;
      if (total != null && total > 0) {
        gbCtx.total = total;
        gbCtx.current = current;
        patch.gbName = entityId ? gbNameOf(entityId) : undefined;
        patch.gbLevel = num(data?.level) ?? undefined;
        patch.gbCurrent = current;
        patch.gbTotal = total;
        patch.gbPlace = null;
        patch.gbOwner = null;
        patch.gbLock = null;
        patch.gbProfit = null;
        patch.gbBe = null;
        patch.gbCustom = null;
        patch.gbCustomPct = null;
      }
    }

    // Own city GB: player clicked a GB, giving us name/level/FP amounts.
    if (cls === 'CityMapService' && method === 'updateEntity' && Array.isArray(data)) {
      gbCtx.visitedPlayerName = null;
      for (const entity of data) {
        if (entity?.type === 'greatbuilding' && entity.cityentity_id) {
          gbCtx.total = entity.state?.forge_points_for_level_up ?? 0;
          gbCtx.current = entity.state?.invested_forge_points ?? 0;
          patch.gbName = gbNameOf(entity.cityentity_id);
          patch.gbLevel = entity.level;
          patch.gbCurrent = gbCtx.current;
          patch.gbTotal = gbCtx.total;
          // Clear stale spot info when a new GB is selected (null passes through mergePayload).
          patch.gbPlace = null;
          patch.gbOwner = null;
          patch.gbLock = null;
          patch.gbProfit = null;
          patch.gbBe = null;
          patch.gbCustom = null;
          patch.gbCustomPct = null;
        }
      }
    }

    // GB rankings: compute which spot the player can take.
    if (cls === 'GreatBuildingsService') {
      let rankings = null;
      if (method === 'getConstruction') {
        rankings = data?.rankings ?? null;
        // getConstruction includes the GB entity — use it to populate gbCtx so
        // extractGbSpot works even for foreign GBs (no CityMapService/updateEntity).
        const entity = data?.entity ?? data?.building ?? null;
        if (entity?.cityentity_id) {
          const newTotal = entity.state?.forge_points_for_level_up ?? 0;
          const newCurrent = entity.state?.invested_forge_points ?? 0;
          if (newTotal > 0) {
            gbCtx.total = newTotal;
            gbCtx.current = newCurrent;
            patch.gbName = gbNameOf(entity.cityentity_id);
            patch.gbLevel = entity.level;
            patch.gbCurrent = newCurrent;
            patch.gbTotal = newTotal;
            patch.gbPlace = null;
            patch.gbOwner = null;
            patch.gbLock = null;
            patch.gbProfit = null;
            patch.gbBe = null;
            patch.gbCustom = null;
            patch.gbCustomPct = null;
          }
        }
      } else if (method === 'contributeForgePoints') {
        rankings = Array.isArray(data) ? data : null;
      } else if (method === 'getConstructionRanking') {
        rankings = data?.rankings ?? (Array.isArray(data) ? data : null);
      }
      if (Array.isArray(rankings)) {
        extractGbSpot(rankings, patch);
      }
    }

    // Attack / defense bonuses from BoostService.getAllBoosts.
    if (cls === 'BoostService' && method === 'getAllBoosts' && Array.isArray(data)) {
      let atk = 0, def = 0;
      for (const b of data) {
        if (!b || typeof b !== 'object') continue;
        const feat = b.targetedFeature;
        if (feat !== 'all') continue;
        const v = num(b.value) ?? 0;
        if (b.type === 'att_boost_attacker' || b.type === 'att_def_boost_attacker' || b.type === 'att_def_boost_attacker_defender') atk += v;
        if (b.type === 'def_boost_attacker' || b.type === 'att_def_boost_attacker' || b.type === 'att_def_boost_attacker_defender') def += v;
      }
      if (atk > 0) patch.atkBonus = atk;
      if (def > 0) patch.defBonus = def;
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
      collectPatch(message, patch, 0);
      processApiMessage(message, patch);
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

  XMLHttpRequest.prototype.open = function (method, requestUrl) {
    this.__foeInfoUrl = typeof requestUrl === 'string' ? requestUrl : '';
    return originalOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
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
  window.fetch = function (input, init) {
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
