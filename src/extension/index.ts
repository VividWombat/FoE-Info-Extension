/*
 * ________________________________________________________________
 * Copyright (C) 2022 FoE-Info - All Rights Reserved
 * this source-code uses a copy-left license
 *
 * you are welcome to contribute changes here:
 * https://github.com/FoE-Info/FoE-Info-Extension
 *
 * AGPL license info:
 * https://github.com/FoE-Info/FoE-Info-Extension/master/LICENSE.md
 * or else visit https://www.gnu.org/licenses/#AGPL
 * ________________________________________________________________
 */
import '@wikimedia/jquery.i18n/libs/CLDRPluralRuleParser/src/CLDRPluralRuleParser.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n';
import '@wikimedia/jquery.i18n/src/jquery.i18n.emitter.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.fallbacks.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.language.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.messagestore.js';
import '@wikimedia/jquery.i18n/src/jquery.i18n.parser.js';
import 'bootstrap';
import collapseOptions, * as collapse from './core/collapse';
import browser from 'webextension-polyfill';
import * as copy from './core/copy';
import {
  setRewardSize,
  setToolOptions,
  setTreasurySize,
  toolOptions,
} from './core/globals';
import * as helper from './core/helper';
import * as storage from './core/storage';
import * as element from './core/AddElement';
import { armyUnitManagementService } from './services/ArmyUnitManagementService';
import { getBonuses, getLimitedBonuses } from './services/BonusService';
import { pickupProduction } from './services/CityProductionService';
import {
  deploySiegeArmy,
  getContinent,
  getProvinceDetailed,
  gvgAges,
  gvgSummary,
  grantIndependence,
} from './services/ClanBattleService';
import { handleClanBattleServiceRequest } from './services/ClanBattleRequestHandler';
import {
  conversationService,
  getConversation,
} from './services/ConversationService';
import { setCurrentPercent } from './services/GreatBuildingsService';
import { handleGreatBuildingsServiceRequest } from './services/GreatBuildingsRequestHandler';
import {
  clearBattleground,
  getBattleground,
  getBuildings,
  getLeaderboard,
  getPlayerLeaderboard,
  getState,
} from './services/GuildBattlegroundService';
import { handleGuildBattlegroundSignalsRequest } from './services/GuildBattlegroundSignalsRequestHandler';
import { handleGuildBattlegroundRequest } from './services/GuildBattlegroundRequestHandler';
import { guildExpeditionService } from './services/GuildExpeditionService';
import { handleGuildExpeditionServiceRequest } from './services/GuildExpeditionRequestHandler';
import { handleClanServiceRequest } from './services/ClanServiceRequestHandler';
import { handleCityMapServiceRequest } from './services/CityMapRequestHandler';
import { handleInventoryServiceRequest } from './services/InventoryRequestHandler';
import { handleMiscRequest } from './services/MiscRequestHandler';
import { handleOtherPlayerServiceRequest } from './services/OtherPlayerRequestHandler';
import {
  otherPlayerService,
  otherPlayerServiceUpdateActions,
} from './services/OtherPlayerService';
import {
  availableFP,
  getPlayerResources,
  getPlayerResourceBag,
  getResourceDefinitions,
  ResourceDefs,
  Resources,
  setResourceDefs,
} from './services/ResourceService';
import {
  allyService,
  boostService,
  boostServiceAllBoosts,
  City,
  emissaryService,
  MilitaryUnitsAccounted,
  PlacedBuildingCounts,
  setMilitaryUnitsText,
  startupService,
  timerBoostService,
} from './services/StartupService';
import { handleStartupServiceRequest } from './services/StartupRequestHandler';
import {
  handleBlueprintServiceRequest,
  handleRewardServiceRequest,
} from './services/RewardAndBlueprintRequestHandler';
import { handleWorldChallengeRequest, hudWcState } from './services/WorldChallengeRequestHandler';
import { hudGbSpot } from './services/GreatBuildingsService';
import { connectWebSocket, disconnectWebSocket } from './services/WebSocketService';
import setOptions, { showOptions } from './state/showOptions';
import '../css/main.scss';

export var debugEnabled = false;
const dbg = (...args: unknown[]): void => { if (debugEnabled) console.debug(...args); };
export var availablePacksFP = 0;
export var PlayerName = '';
export var PlayerID = 0;
export var worlds = [];

export var MyInfo = {
  name: '',
  era: '',
  id: 0,
  guild: '',
  guildID: 0,
  guildPosition: 0,
  createdAt: 0,
};

export var ignoredPlayers = {
  ignoredByPlayerIds: {},
  ignoredPlayerIds: {},
};

export var GBselected = {
  player: 0,
  player_name: '',
  id: 0,
  level: 0,
  name: '',
  era: '',
  connected: false,
  max_level: 0,
  current: 0,
  total: 0,
};

type GenericRecord = Record<string, unknown>;
type HeaderLike = { name: string; value?: string };
var GuildDonations: GenericRecord[] = [];
var GuildTreasury: GenericRecord[] = [];
export var targetsTopic = 'targets';
export var targetText = '';
var GuildsGoods: GenericRecord[] = [];
// var GBdefs = [];
export var CityEntityDefs: any = {};
export var CityProtections: GenericRecord[] = [];
export var MilitaryDefs: GenericRecord[] = [];
export var CastleDefs: GenericRecord[] = [];
export var SelectionKitDefs: GenericRecord[] = [];
export var BoostMetadataDefs: GenericRecord[] = [];
export var VolcanoProvinceDefs: GenericRecord[] = [];
export var WaterfallProvinceDefs: GenericRecord[] = [];
export var BuildingDefs: GenericRecord[] = [];
type BuildingBoostHint = { type: string; value: number; targetedFeature: string };
// All BoostHints per building type per era, extracted from building metadata components
export var BuildingBoostHints: Record<string, Record<string, BuildingBoostHint[]>> = {};
// flag to indicate that all metadata files have been processed
export var metadataLoaded = false;
export var hiddenRewards: GenericRecord[] = [];
// store StartupService message until metadata is ready
var pendingStartupMsg: GenericRecord | null = null;
export var Goods = {
  sash: 0,
  sat: 0,
  sajm: 0,
  sav: 0,
  saab: 0,
  sam: 0,
  vf: 0,
  of: 0,
  af: 0,
  fe: 0,
  te: 0,
  ce: 0,
  pme: 0,
  me: 0,
  pe: 0,
  ina: 0,
  cma: 0,
  lma: 0,
  hma: 0,
  ema: 0,
  ia: 0,
  ba: 0,
  noage: 0,
};
export var EpocTime = 0;
var GameVersion = '';
export var GameOrigin = '';

export var donationPercent = 190;
export var donationSuffix = '';
export var MyGuildPermissions = 0;

export var Bonus = {
  aid: 0,
  spoils: 0,
  diplomatic: 0,
  strike: 0,
};

export var url: any[] = [];

var rewardsGE: any[] = [];
var rewardsGBG: any[] = [];
var rewardsGeneric: any[] = [];
export var rewardsArmy: GenericRecord[] = [];
export var rewardsCity: GenericRecord[] = [];
var rewardsOtherPlayer: any[] = [];

var tool = browser.runtime.getManifest();
dbg(tool.name);
dbg(tool.version);

type HudGoodsEntry = { k: string; v: number };

type HudPayload = {
  // Resources (sniffer + DevTools)
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
  // City combat stats (DevTools only)
  atkBonus?: number;
  defBonus?: number;
  arcBonus?: number;
  guildName?: string;
  // Limited bonuses (DevTools only)
  bonusSpoils?: number;
  bonusDiplomatic?: number;
  bonusStrike?: number;
  bonusAid?: number;
  // Active great building (DevTools only)
  gbName?: string;
  gbLevel?: number;
  gbCurrent?: number;
  gbTotal?: number;
  gbOwner?: string;
  gbPlace?: number;
  gbLock?: number;
  gbProfit?: number;
  gbBe?: number;
  gbCustom?: number;
  gbCustomPct?: number;
  // World Challenge (DevTools WS)
  wcLevel?: number;
  wcPoints?: number;
  wcThreshold?: number;
  // Top goods by quantity (DevTools only)
  goods?: HudGoodsEntry[];
};

let hudUpdateTimer: ReturnType<typeof setTimeout> | null = null;

const buildHudPayload = (): HudPayload => {
  const rss = (Resources ?? {}) as Record<string, unknown>;
  const asNum = (value: unknown): number | null =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;

  const topGoods: HudGoodsEntry[] = Object.entries(Goods)
    .filter(([, v]) => (v as number) > 0)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 6)
    .map(([k, v]) => ({ k, v: v as number }));

  return {
    // Resources
    playerName: MyInfo?.name || undefined,
    world: GameOrigin || undefined,
    era: MyInfo?.era || undefined,
    coins: asNum(rss.money),
    supplies: asNum(rss.supplies),
    fp: asNum(availableFP),
    fpTotal: asNum(availableFP + availablePacksFP),
    diamonds: asNum(rss.premium),
    medals: asNum(rss.medals),
    population: asNum(rss.population),
    // City
    atkBonus: City.Attack || undefined,
    defBonus: City.Defense || undefined,
    arcBonus: City.ArcBonus || undefined,
    guildName: MyInfo?.guild || undefined,
    // Limited bonuses
    bonusSpoils: Bonus.spoils,
    bonusDiplomatic: Bonus.diplomatic,
    bonusStrike: Bonus.strike,
    bonusAid: Bonus.aid,
    // Active GB
    gbName: GBselected.name || undefined,
    gbLevel: GBselected.name ? GBselected.level : undefined,
    gbCurrent: GBselected.name ? GBselected.current : undefined,
    gbTotal: GBselected.name ? GBselected.total : undefined,
    gbOwner: hudGbSpot?.owner || undefined,
    gbPlace: hudGbSpot?.place,
    gbLock: hudGbSpot?.lock,
    gbProfit: hudGbSpot?.profit,
    gbBe: hudGbSpot?.be,
    gbCustom: hudGbSpot?.custom,
    gbCustomPct: hudGbSpot?.customPct,
    // World Challenge
    wcLevel: hudWcState?.level,
    wcPoints: hudWcState?.points,
    wcThreshold: hudWcState?.threshold,
    // Goods
    goods: topGoods.length ? topGoods : undefined,
  };
};

const publishHudData = () => {
  try {
    const tabId = (browser.devtools as any)?.inspectedWindow?.tabId;
    if (typeof tabId !== 'number') {
      return;
    }

    browser.tabs
      .get(tabId)
      .then((tab) => {
        const tabUrl = tab?.url || '';
        if (!/forgeofempires\.com\/game\//i.test(tabUrl)) {
          return;
        }

        return browser.tabs
          .sendMessage(tabId, {
            type: 'foe-info-hud:update',
            payload: buildHudPayload(),
          })
          .catch(() => {
            // Content script may be unavailable during reload/navigation.
          });
      })
      .catch(() => {
        // Tab may be unavailable while devtools target is reloading.
      });
  } catch (error) {
    dbg('HUD publish skipped', error);
  }
};

const scheduleHudUpdate = () => {
  if (hudUpdateTimer) {
    clearTimeout(hudUpdateTimer);
  }
  hudUpdateTimer = setTimeout(() => {
    publishHudData();
  }, 140);
};

export var darkMode = browser.devtools.panels.themeName;
const panelParams = new URLSearchParams(window.location.search);
export var uiMode: 'classic' | 'traditional' = 'classic';
let uiModeBadge: HTMLElement | null = null;

const applyUiMode = (mode: unknown) => {
  const normalizedMode = mode === 'traditional' ? 'traditional' : 'classic';
  uiMode = normalizedMode;
  document.body.setAttribute('data-ui-mode', uiMode);
  document.body.classList.remove('ui-mode-classic', 'ui-mode-traditional');
  document.body.classList.add(`ui-mode-${uiMode}`);
  if (uiModeBadge) {
    uiModeBadge.textContent = uiMode === 'traditional' ? 'Traditional' : 'Classic';
  }
};

export let designPreview = false;

const applyDesignPreview = (enabled: boolean) => {
  designPreview = enabled;
  document.body.setAttribute('data-design-preview', enabled ? 'true' : 'false');
};

const applyTheme = (themeName: unknown) => {
  const normalizedTheme = themeName === 'dark' ? 'dark' : 'light';
  darkMode = normalizedTheme;
  document.body.setAttribute('data-theme', normalizedTheme);
  document.body.classList.toggle('theme-dark', normalizedTheme === 'dark');
  document.body.classList.toggle('theme-light', normalizedTheme === 'light');
};

let themePreference: 'auto' | 'light' | 'dark' = 'auto';

const applyThemePreference = (pref: unknown) => {
  themePreference = pref === 'light' ? 'light' : pref === 'dark' ? 'dark' : 'auto';
  if (themePreference === 'auto') {
    applyTheme(browser.devtools.panels.themeName);
  } else {
    applyTheme(themePreference);
  }
};

applyUiMode(panelParams.get('uiMode'));
applyTheme(browser.devtools.panels.themeName);

browser.storage.local.get('tool').then((result: any) => {
  if (result?.tool?.uiMode) {
    applyUiMode(result.tool.uiMode);
  }
  applyThemePreference(result?.tool?.theme);
  applyDesignPreview(!!result?.tool?.designPreview);
});
console.info('themeName', browser.devtools.panels.themeName);
var title = document.createElement('div');
document.body.appendChild(title);
title.id = 'title';
title.className = 'd-flex flex-row justify-content-between';
title.classList.add('panel-title');

var newelement: HTMLElement = document.body;
newelement.classList.add('bootstrap-styles');
newelement = document.createElement('div');
newelement.className = 'p-2';
title.appendChild(newelement);
const logoImg = document.createElement('img');
logoImg.src = '/icons/Icon48.png';
logoImg.width = 24;
logoImg.height = 24;
logoImg.id = 'logo';
// if (DEV)
logoImg.addEventListener('click', toggleDebug);
newelement.appendChild(logoImg);
newelement = document.createElement('div');
newelement.className = 'p-8 title';
title.appendChild(newelement);
const titleHeading = document.createElement('h6');
titleHeading.className = 'title';
titleHeading.textContent = EXT_NAME;
newelement.appendChild(titleHeading);
if (DEV) {
  uiModeBadge = document.createElement('span');
  uiModeBadge.className = 'ui-mode-badge';
  uiModeBadge.textContent = uiMode === 'traditional' ? 'Traditional' : 'Classic';
  titleHeading.appendChild(uiModeBadge);
}
newelement = document.createElement('div');
newelement.innerHTML = `<span class="material-icons-outlined md-18 options-icon">settings</span>`;
newelement.classList.toggle('p-2');
newelement.id = 'go-to-options';

title.appendChild(newelement);

// city info
export var content = document.createElement('div');
document.body.appendChild(content);
content.id = 'content';
content.className = 'panel-content';
export var citystats = document.createElement('div');
content.appendChild(citystats);
citystats.className = 'alert alert-warning';
citystats.id = 'citystats';
citystats.innerHTML = `<p><strong><span data-i18n="load">Load the game ...</span></strong></p>`;

export var alerts = document.createElement('div');
alerts.id = 'alerts';
content.appendChild(alerts);

export var targets = document.createElement('div');
targets.id = 'targets';
content.appendChild(targets);

export var bonusDIV = document.createElement('div');
bonusDIV.id = 'bonus';
content.appendChild(bonusDIV);

export var incidents = document.createElement('div');
incidents.className = 'incidents';
incidents.id = 'incidents';
content.appendChild(incidents);
export var cityinvested = document.createElement('div');
content.appendChild(cityinvested);
cityinvested.id = 'invested';

export var galaxyDIV = document.createElement('div');
galaxyDIV.id = 'galaxy';
// galaxyDIV.className="hidden";
galaxyDIV.style.display = 'none';
content.appendChild(galaxyDIV);

export var visitstats = document.createElement('div');
content.appendChild(visitstats);
visitstats.id = 'visit';
export var cityrewards = document.createElement('div');
content.appendChild(cityrewards);
cityrewards.id = 'rewards';

export var output = document.createElement('div');
content.appendChild(output);
output.id = 'output';
export var donationDIV = document.createElement('div');
content.appendChild(donationDIV);
donationDIV.id = 'donation';
export var donation2DIV = document.createElement('div');
content.appendChild(donation2DIV);
donation2DIV.id = 'donation2';
export var donationDIV2 = document.createElement('div');
content.appendChild(donationDIV2);
donationDIV2.id = 'donationDIV2';
export var greatbuilding = document.createElement('div');
content.appendChild(greatbuilding);
greatbuilding.id = 'greatbuilding';

export var overview = document.createElement('div');
content.appendChild(overview);
overview.id = 'overview';
export var worldchallengeDIV = document.createElement('div');
content.appendChild(worldchallengeDIV);
worldchallengeDIV.id = 'worldchallenge';
export var cultural = document.createElement('div');
content.appendChild(cultural);
cultural.id = 'cultural';
export var info = document.createElement('div');
content.appendChild(info);
info.id = 'info';

export var armyDIV = document.createElement('div');
content.appendChild(armyDIV);
armyDIV.id = 'army';

export var goodsDIV = document.createElement('div');
content.appendChild(goodsDIV);
goodsDIV.id = 'goods';

export var gvg = document.createElement('div');
content.appendChild(gvg);
gvg.id = 'gvg';

var buildingsDIV = document.createElement('div');
buildingsDIV.id = 'buildings';
content.appendChild(buildingsDIV);

export var guild = document.createElement('div');
content.appendChild(guild);
guild.id = 'guild';
export var friendsDiv = document.createElement('div');
content.appendChild(friendsDiv);
friendsDiv.id = 'friends';
export var treasury = document.createElement('div');
content.appendChild(treasury);
treasury.id = 'treasury';
export var treasuryLog = document.createElement('div');
content.appendChild(treasuryLog);
treasuryLog.id = 'treasuryLog';
export var clipboard = document.createElement('div');
content.appendChild(clipboard);
clipboard.id = 'clipboard';
clipboard.style.display = 'none';
export var alerts_bottom = document.createElement('div');
alerts_bottom.id = 'alerts_bottom';
content.appendChild(alerts_bottom);
export var debug = document.createElement('div');
content.appendChild(debug);
debug.id = 'debug';
export var modal = document.createElement('div');
content.appendChild(modal);
modal.id = 'modal';

var modalElement = document.createElement('div');
modalElement.className = 'modal-dialog modal-sm';
modalElement.id = 'testModal';
modal.appendChild(modalElement);

const getType = (type: string) => {
  return type.replace(/.*(javascript|image|html|font|json|css|text).*/g, '$1');
};

const safeJsonParse = (text: unknown, context: string): unknown => {
  if (!text || typeof text !== 'string') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn(`Failed to parse JSON (${context})`, error);
    return null;
  }
};

const isRecord = (value: unknown): value is GenericRecord => {
  return !!value && typeof value === 'object' && !Array.isArray(value);
};

const toRecordArray = (value: unknown): GenericRecord[] => {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (isRecord(value)) {
    return [value];
  }
  return [];
};

const parseMetadataPayload = async (
  metadataUrl: string,
): Promise<GenericRecord[] | null> => {
  if (!metadataUrl || typeof metadataUrl !== 'string') {
    return null;
  }

  try {
    const response = await fetch(metadataUrl);
    const body = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const bodyStart = body.trim().slice(0, 1);
    const looksLikeJson =
      /json|javascript/i.test(contentType) ||
      bodyStart === '{' ||
      bodyStart === '[';

    if (!looksLikeJson) {
      dbg('Skipping non-JSON metadata', metadataUrl, contentType);
      return null;
    }

    return toRecordArray(safeJsonParse(body, `metadata ${metadataUrl}`));
  } catch (error) {
    console.error('Failed loading metadata', metadataUrl, error);
    return null;
  }
};

const addAvailablePacksFP = (amount: unknown) => {
  if (typeof amount === 'number') {
    availablePacksFP += amount;
  }
};

const setAvailablePacksFP = (amount: unknown) => {
  if (typeof amount === 'number') {
    availablePacksFP = amount;
  }
};

const getAvailablePacksFP = () => {
  return availablePacksFP;
};

const setAvailableFPText = () => {
  const availableFpElement = document.getElementById('availableFPID');
  if (availableFpElement)
    availableFpElement.textContent = String(availablePacksFP + availableFP);
};


const getPlayerID = () => {
  return PlayerID;
};

const setPlayerState = (name: string | undefined, id: number | undefined) => {
  if (typeof name === 'string') {
    PlayerName = name;
  }
  if (typeof id === 'number') {
    PlayerID = id;
  }
};

const getPlayerName = () => {
  return PlayerName;
};

const setCityProtections = (protections: unknown) => {
  CityProtections = Array.isArray(protections)
    ? (protections as GenericRecord[])
    : [];
};

const setGameOrigin = (origin: string) => {
  GameOrigin = origin;
  scheduleHudUpdate();
};

const getGameOrigin = () => {
  return GameOrigin;
};

const isMetadataLoaded = () => {
  return metadataLoaded;
};

const setPendingStartupMessage = (msg: GenericRecord | null) => {
  pendingStartupMsg = msg;
};

const setEpocTime = (time: number) => {
  EpocTime = time;
};

const setHiddenRewards = (rewards: unknown[]) => {
  hiddenRewards = Array.isArray(rewards)
    ? (rewards as GenericRecord[])
    : [];
};

const getCulturalDiv = () => {
  return cultural;
};

const setCulturalDiv = (newCultural: HTMLElement) => {
  cultural = newCultural;
};

const getTotalAvailableFP = () => {
  return availablePacksFP + availableFP;
};

document.querySelector('#go-to-options')?.addEventListener('click', function () {
  browser.permissions
    .request({
      permissions: ['storage'] as unknown as any,
    })
    .then((granted) => {
      if (granted) {
        if (browser.runtime.openOptionsPage) {
          browser.runtime.openOptionsPage();
        } else {
          window.open(browser.runtime.getURL('options.html'));
        }
      }
    });
});

export var language =
  window.navigator.language;
dbg(language);
if (process.env.NODE_ENV === 'development') {
  $.i18n.debug = true;
}

window.addEventListener(
  'message',
  function (event) {
    dbg('received response:  ', event.data);
  },
  false,
);

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', ({ matches }) => {
    if (themePreference === 'auto') {
      applyTheme(matches ? 'dark' : 'light');
    }
  });
function onEvent(message: unknown, params: unknown) {
  dbg(message, params);
}

browser.permissions
  .contains({
    permissions: ['storage'],
  })
  .then((result) => {
    if (result) {
      browser.storage.local.getBytesInUse(null).then((size) => {
        dbg('getBytesInUse', size);
      });

      browser.storage.local.get(null).then((result) => {
        receiveStorage(result);
        if (language != 'auto') {
          $.i18n({
            locale: language,
          });
        }
        dbg(language, $.i18n().locale, $.i18n.debug);
        $.i18n()
          .load({
            de: {
              load: 'Laden Sie das Spiel, um Ihre Stadtstatistiken anzuzeigen',
            },
            sv: {
              load: 'Ladda spelet för att se din stadsstatistik',
            },
            fi: {
              load: 'Lataa peli nähdäksesi kaupunkitilastot',
            },
            pt: {
              load: 'Carregue o jogo para ver as estatísticas da sua cidade',
            },
            nl: {
              load: 'Laad het spel om je stadsstatistieken te zien',
            },
            sr: {
              load: 'Учитајте игру да бисте видели статистику града',
            },
            ru: {
              load: 'Слава Украине!',
            },
            ua: {
              load: 'Слава Україні!',
            },
            en: 'i18n/en.json',
            es: 'i18n/es.json',
            fr: 'i18n/fr.json',
            el: 'i18n/el.json',
            gr: 'i18n/gr.json',
            it: 'i18n/it.json',
          })
          .done(function () {
            $('body').i18n();
            dbg(
              'jQuery ' +
                (typeof jQuery !== 'undefined' ? $().jquery : 'NOT') +
                ' loaded',
            );
            dbg('i18n.load OK');
          });
      });
    } else {
      // The extension doesn't have the permissions.
      citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Please Enable FoE-Info</strong></p>
							  <button type="button" class="btn btn-danger" id="enableFoE">Enable</button></div>`;
      citystats.className = 'alert alert-danger';
      document
        .getElementById('enableFoE')!
        .addEventListener('click', function () {
          browser.permissions
            .request({
              permissions: ['storage', 'clipboardWrite'] as unknown as any,
            })
            .then((granted) => {
              if (granted) {
                citystats.innerHTML = `<div class="alert alert-danger"><p><strong>Now Load The Game !</strong></div>`;
              }
            });
        });
      return;
    }
  });

browser.devtools.network.onRequestFinished.addListener(handleRequestFinished);

// Routes a parsed WebSocket frame through the same handler pipeline as HTTP messages.
// Auth confirmations and telemetry-only frames that return false from all handlers are
// silently dropped (same as the HTTP catch-all path).
function handleWebSocketMessage(msg: import('./services/types').HandlerMessage): void {
  if (!msg.requestClass) return;
  handleMiscRequest(msg, {
    conversationService,
    getConversation,
    armyUnitManagementService,
    clearStartup,
    clearBattleground,
    ignoredPlayers,
    setEpocTime,
    clearForMainCity,
    helper,
    getResourceDefinitions,
    getPlayerResources,
    getPlayerResourceBag,
    MyInfo,
    showOptions,
    citystats,
    setHiddenRewards,
    emissaryService,
    getCultural: getCulturalDiv,
    setCultural: setCulturalDiv,
    Resources,
    collapse,
    element,
    showCultural: { clearCultural },
    getBonuses,
    getLimitedBonuses,
    boostService,
    boostServiceAllBoosts,
    timerBoostService,
    allyService,
  }) ||
  handleWorldChallengeRequest(msg, worldchallengeDIV);
  // Additional handlers can be chained here as new WS services are discovered.
  scheduleHudUpdate();
}

function handleRequestFinished(request: any) {
  const response = request.response;
  var contentType = '';
  let contentHeader: HeaderLike | undefined;

  if (response.httpVersion == 'http/2.0')
    contentHeader = response.headers.find(
      (header: HeaderLike) => header.name === 'content-type',
    );
  else
    contentHeader = response.headers.find(
      (header: HeaderLike) => header.name === 'Content-Type',
    );

  if (contentHeader) {
    contentType = getType(contentHeader.value);
  }

  if (
    request.request.url.match(
      /https:\/\/.*\.forgeofempires\.com\/game\/json\?h=/g,
    ) ||
    request.request.url.match(
      /https:\/\/foe.*\.innogamescdn\.com\/start\/metadata\?id=(.*)/g,
    )
  ) {
    const clientIdentificationHeader = request.request.headers.find(
      (header: HeaderLike) => header.name === 'client-identification',
    );

    if (
      clientIdentificationHeader &&
      clientIdentificationHeader.value &&
      GameVersion != clientIdentificationHeader.value.substr(8, 5)
    ) {
      GameVersion = clientIdentificationHeader.value.substr(8, 5);
      citystats.innerHTML += `<div><span data-i18n="gameversion">Game Version</span>: ${GameVersion}<br>${EXT_NAME}: ${tool.version}</div>`;
    }

    request.getContent().then(async ([body, mimeType]: [string, string]) => {
      const parsed = safeJsonParse(body, 'network response body');
      if (parsed == null) {
        return;
      }
      const parsedMessages = toRecordArray(parsed);
      if (parsedMessages.length) {
        for (var i = 0; i < parsedMessages.length; i++) {
          const msg = parsedMessages[i];
          const requestClass =
            typeof msg.requestClass === 'string' ? msg.requestClass : '';
          const requestMethod =
            typeof msg.requestMethod === 'string' ? msg.requestMethod : '';

          // check if this is static data service info that holds all URLs to all metadata files
          if (
            requestClass === 'StaticDataService' &&
            requestMethod == 'getMetadata'
          ) {
            const metadataItems = Array.isArray(msg.responseData)
              ? msg.responseData
              : [];

            if (!metadataItems.length) {
              continue;
            }

            try {
              const requests = metadataItems.map((item: any) =>
                parseMetadataPayload(item?.url),
              );
              const results = await Promise.all(requests);

              results.forEach((data: any, idx: number) => {
                if (!data || !Array.isArray(data)) return;
                const identifier = metadataItems[idx]?.identifier;
                if (identifier === 'city_entities') {
                  data.forEach(function (msg: any) {
                    if (
                      msg.__class__ &&
                      msg.__class__.substring(0, 10) == 'CityEntity'
                    ) {
                      if (!CityEntityDefs[msg.id]) {
                        CityEntityDefs[msg.id] = {
                          name: msg.name,
                          abilities: [],
                          entity_levels: [],
                          available_products: [],
                        };
                      }
                      CityEntityDefs[msg.id] = msg;
                    } else if (
                      msg.__class__ &&
                      msg.__class__ == 'GenericCityEntity'
                    ) {
                      if (!CityEntityDefs[msg.id]) {
                        CityEntityDefs[msg.id] = {
                          name: msg.name,
                          abilities: [],
                          entity_levels: [],
                          available_products: [],
                        };
                      }
                      CityEntityDefs[msg.id] = msg;
                    }
                  });
                }
              });
              metadataLoaded = true;
            } catch (err) {
              console.error('Metadata fetch failed', err);
              for (const item of metadataItems) {
                try {
                  const data = await parseMetadataPayload(item?.url);
                  if (!data) {
                    continue;
                  }
                  data.forEach(processMetadataEntry);
                } catch (e) {
                  console.error('metadata fetch failed', item, e);
                }
              }
              storage.set('CityEntityDefs', CityEntityDefs);
              metadataLoaded = true;
              if (pendingStartupMsg) {
                startupService(pendingStartupMsg);
                pendingStartupMsg = null;
              }
            }
          } else if (
            requestClass == 'CampaignService' &&
            requestMethod == 'getDeposits'
          ) {
            /*CampaignService*/
          } else if (
            handleOtherPlayerServiceRequest(msg, {
              helper,
              GBselected,
              getPlayerID,
              clearVisitPlayer,
              otherPlayerService,
              otherPlayerServiceUpdateActions,
              showOptions,
              rewardsOtherPlayer,
              showReward,
              setPlayerState,
              setCityProtections,
            })
          ) {
            // handled in module
          } else if (
            handleInventoryServiceRequest(msg, {
              CityEntityDefs,
              availableFP,
              setAvailablePacksFP,
            })
          ) {
            // handled in module
          } else if (
            handleMiscRequest(msg, {
              conversationService,
              getConversation,
              armyUnitManagementService,
              clearStartup,
              clearBattleground,
              ignoredPlayers,
              setEpocTime,
              clearForMainCity,
              helper,
              getResourceDefinitions,
              getPlayerResources,
              getPlayerResourceBag,
              MyInfo,
              showOptions,
              citystats,
              setHiddenRewards,
              emissaryService,
              getCultural: getCulturalDiv,
              setCultural: setCulturalDiv,
              Resources,
              collapse,
              element,
              showCultural: { clearCultural },
              getBonuses,
              getLimitedBonuses,
              boostService,
              boostServiceAllBoosts,
              timerBoostService,
              allyService,
            })
          ) {
            // handled in module
          } else if (
            handleCityMapServiceRequest(msg, {
              MyInfo,
              GBselected,
              helper,
              setPlayerName,
              element,
              collapse,
              PlayerName: getPlayerName,
              info,
              showOptions,
            })
          ) {
            // handled in module
          } else if (
            handleStartupServiceRequest(msg, request, {
              setGameOrigin,
              getGameOrigin,
              MyInfo,
              receiveStorage,
              output,
              overview,
              cityinvested,
              cityrewards,
              incidents,
              donationDIV,
              greatbuilding,
              gvg,
              guild,
              citystats,
              visitstats,
              cultural,
              metadataLoaded: isMetadataLoaded,
              startupService,
              setPendingStartupMsg: setPendingStartupMessage,
              onSocketParams: (gatewayUrl, token) => {
                disconnectWebSocket();
                connectWebSocket(gatewayUrl, token, handleWebSocketMessage);
              },
            })
          ) {
            // handled in module
          } else if (msg.requestClass == 'RewardService') {
            handleRewardServiceRequest(msg, showOptions, showReward);
          } else if (
            msg.requestClass == 'CityProductionService' &&
            msg.requestMethod == 'pickupProduction'
          ) {
            pickupProduction(msg);
          } else if (
            msg.requestClass == 'BlueprintService' &&
            msg.requestMethod == 'newReward'
          ) {
            handleBlueprintServiceRequest(msg, {
              helper,
              showOptions,
              collapse,
              element,
              cityrewards,
              rewardObserve,
              addAvailablePacksFP,
              getTotalAvailableFP,
            });
          } else if (msg.requestClass == 'GreatBuildingsService') {
            if (
              handleGreatBuildingsServiceRequest(msg, request, safeJsonParse, {
                showOptions,
                cityinvested,
                City,
                availablePacksFP: getAvailablePacksFP,
                availableFP,
                element,
                collapse,
                copy,
                setPlayerName,
                setAvailablePacksFP,
                setAvailableFPText,
              })
            ) {
              scheduleHudUpdate();
            }
          } else if (msg.requestClass == 'ClanBattleService') {
            if (
              !handleClanBattleServiceRequest(msg, {
                clearForGVG: fCleardForGVG,
                getContinent,
                getProvinceDetailed,
                deploySiegeArmy,
                grantIndependence,
              })
            ) {
              dbg('ClanBattleService', msg);
            }
          } else if (msg.requestClass == 'GuildExpeditionService') {
            if (
              !handleGuildExpeditionServiceRequest(msg, {
                clearExpedition,
                showOptions,
                guildExpeditionService,
                helper,
                rewardsGE,
                showReward,
              })
            ) {
              dbg('GuildExpeditionService', msg);
            }
          } else if (
            handleGuildBattlegroundRequest(msg, {
              showOptions,
              clearForBattleground,
              getLeaderboard,
              getPlayerLeaderboard,
              getBattleground,
              getState,
              getBuildings,
            })
          ) {
            // handled in module
          } else if (msg.requestClass == 'GuildBattlegroundSignalsService') {
            if (
              !handleGuildBattlegroundSignalsRequest(
                msg,
                request,
                safeJsonParse,
              )
            ) {
              dbg('GuildBattlegroundSignalsService', msg);
            }
          } else if (
            msg.__class__ &&
            msg.__class__.substring(0, 17) == 'GuildBattleground'
          ) {
            if (
              msg.__class__ &&
              msg.__class__ == 'GuildBattlegroundMapMetadata'
            ) {
              if (msg.id == 'volcano_archipelago') {
                VolcanoProvinceDefs = msg.provinces;
                VolcanoProvinceDefs[0].id = 0;
              } else if (msg.id == 'waterfall_archipelago') {
                WaterfallProvinceDefs = msg.provinces;
                WaterfallProvinceDefs[0].id = 0;
              } else dbg(msg);
            } else if (
              msg.__class__ &&
              msg.__class__ == 'GuildBattlegroundLeagueMetadata'
            ) {
              // no action needed for league metadata
            } else if (
              msg.__class__ &&
              msg.__class__ == 'GuildBattlegroundBuildingMetadata'
            ) {
              if (!BuildingDefs[msg.id]) {
                BuildingDefs[msg.id] = {
                  name: msg.name,
                  buildingTime: msg.buildingTime,
                  description: msg.description,
                };
              }
            } else dbg('GuildBattleground', msg);
          } else if (
            handleClanServiceRequest(msg, {
              showOptions,
              element,
              collapse,
              helper,
              copy,
              friendsDiv,
              MyInfo,
              setMyGuildPosition,
              GuildDonations,
              GuildTreasury,
              ResourceDefs,
              treasuryLog,
              treasury,
              cityinvested,
              output,
              overview,
              alerts,
              donationDIV,
              incidents,
              donation2DIV,
              donationDIV2,
              greatbuilding,
              guild,
              debug,
              info,
              visitstats,
              cultural,
              gvg,
              gvgSummary,
              gvgAges,
              toolOptions,
              initTreasury,
              setTreasurySize,
            })
          ) {
            // handled in module
          } else if (
            handleWorldChallengeRequest(msg, worldchallengeDIV)
          ) {
            // handled in module
          } else {
            if (msg.requestClass == null) {
              processMetadataEntry(msg);
            }
          }
        }
      } else {
        if (isRecord(parsed) && parsed.player_name && parsed.worlds) {
          worlds = parsed.worlds as any;
          dbg('worlds', worlds);
        }
      }
      scheduleHudUpdate();
    });
  }
}

browser.storage.onChanged.addListener(storageChange);

function storageChange(
  changes: Record<string, browser.Storage.StorageChange>,
  _namespace: string,
) {
  for (var key in changes) {
    var storageChange = changes[key];
    if (key == 'showOptions') setOptions('showOptions', storageChange.newValue);
    else if (key == 'tool') {
      const toolSettings = storageChange.newValue as any;
      if (toolSettings?.language) {
        language = toolSettings.language;
      }
      dbg(language);
      applyUiMode(toolSettings?.uiMode);
      applyThemePreference(toolSettings?.theme);
      applyDesignPreview(!!toolSettings?.designPreview);
    } else if (key == 'targets') {
      // dbg(storageChange.newValue,targetsTopic);
      targetsTopic = storageChange.newValue;
    } else if (key == 'targetText') {
      // dbg(storageChange.newValue,targetText);
      targetText = storageChange.newValue;
    } else if (key == 'toolOptions') {
      setToolOptions(storageChange.newValue);
      // dbg(toolOptions);
    } else if (key == 'donationPercent') {
      donationPercent = storageChange.newValue;
      setCurrentPercent(storageChange.newValue);
    } else if (key == 'donationSuffix') {
      donationSuffix = storageChange.newValue;
    } else if (key == 'url') {
      url = storageChange.newValue;
    }
  }
}

export function setMyInfo(
  name: string,
  id: number,
  clan: string,
  clan_id: number,
  createdAt: number,
  era: string,
) {
  MyInfo.name = name;
  MyInfo.id = id;
  MyInfo.guild = clan;
  MyInfo.guildID = clan_id;
  MyInfo.createdAt = createdAt;
  MyInfo.era = era;
  scheduleHudUpdate();
}

export function setMyName(name: string) {
  MyInfo.name = name;
  scheduleHudUpdate();
}

export function setMyID(id: number) {
  MyInfo.id = id;
  scheduleHudUpdate();
}

export function setMyGuild(name: string) {
  MyInfo.guild = name;
  scheduleHudUpdate();
}

export function setMyGuildID(id: number) {
  MyInfo.guildID = id;
  scheduleHudUpdate();
}

export function setMyGuildPermissions(permissions: number) {
  MyGuildPermissions = permissions;
}

export function setMyGuildPosition(id: number) {
  MyInfo.guildPosition = id;
  storage.set(GameOrigin + 'MyInfo', MyInfo);
}

export function setPlayerName(name: string | undefined, id: number | undefined) {
  if (typeof name === 'string') {
    PlayerName = name;
    GBselected.player_name = name;
  }
  if (typeof id === 'number') {
    PlayerID = id;
  }
  scheduleHudUpdate();
}

function clearInnerHTML(...elements: Array<HTMLElement | null | undefined>): void {
  for (const el of elements) {
    if (el) el.innerHTML = '';
  }
}

function fCleardForGVG() {
  clearInnerHTML(cityinvested, output, overview, alerts, donationDIV, incidents, donation2DIV, donationDIV2, greatbuilding, guild, debug, info, visitstats, cultural, friendsDiv, treasury, treasuryLog);
  visitstats.className = '';
  cultural.className = '';
}

function clearVisitPlayer() {
  clearInnerHTML(cityinvested, output, overview, donationDIV, donation2DIV, donationDIV2, greatbuilding, guild, debug, info, cultural, friendsDiv, treasury, treasuryLog);
  cultural.className = '';
}

function clearExpedition() {
  clearInnerHTML(cityinvested, overview, alerts, donationDIV, incidents, donation2DIV, donationDIV2, greatbuilding, guild, debug, info, visitstats, cultural, friendsDiv, gvg, treasury, treasuryLog, gvgSummary, gvgAges);
  visitstats.className = '';
  cultural.className = '';
  gvg.className = '';
}

function clearForBattleground() {
  clearInnerHTML(cityinvested, overview, alerts, donationDIV, incidents, donation2DIV, donationDIV2, greatbuilding, guild, debug, info, visitstats, cultural, friendsDiv, gvg, treasury, treasuryLog, gvgSummary, gvgAges);
  visitstats.className = '';
  cultural.className = '';
  gvg.className = '';
}

function clearForMainCity() {
  clearInnerHTML(incidents, donation2DIV, donationDIV2, greatbuilding, targets, guild, debug, info, donationDIV, visitstats, cultural, gvg, treasury, treasuryLog, gvgSummary, gvgAges);
  visitstats.className = '';
  cultural.className = '';
  gvg.className = '';
}

function clearStartup() {
  clearInnerHTML(cityinvested, output, overview, alerts, cityrewards, donationDIV, incidents, donation2DIV, donationDIV2, greatbuilding, guild, debug, info, citystats, visitstats, cultural, friendsDiv, gvg, armyDIV, treasury, treasuryLog, gvgSummary, gvgAges);
  visitstats.className = '';
  cultural.className = '';
  gvg.className = '';
  GuildDonations = [];
  GuildTreasury = [];
  GuildsGoods = [];
  Bonus = { aid: 0, spoils: 0, diplomatic: 0, strike: 0 };
  rewardsGE = [];
  rewardsGBG = [];
  rewardsGeneric = [];
  rewardsArmy = [];
  rewardsCity = [];
  rewardsOtherPlayer = [];
}

function clearCultural() {
  clearInnerHTML(cityinvested, overview, donationDIV, incidents, donation2DIV, donationDIV2, greatbuilding, guild, debug, info, visitstats, friendsDiv, gvg, armyDIV, treasury, treasuryLog, gvgSummary, gvgAges);
  visitstats.className = '';
  gvg.className = '';
}

function receiveStorage(result) {
  dbg('result', result);
  Object.entries(result).forEach((element) => {
    const [key, value] = element;
    if (key.substring(0, 8) == 'collapse') {
      collapseOptions(key, value);
    } else if (key == 'showOptions') setOptions('showOptions', value);
    else if (key == ResourceDefs) {
      setResourceDefs(value);
    } else if (key == 'CityEntityDefs') {
      CityEntityDefs = value;
      dbg(key, value);
      for (const [buildingId, def] of Object.entries(CityEntityDefs as Record<string, any>)) {
        const placedCount = PlacedBuildingCounts[buildingId] || 0;
        if (!placedCount) continue;
        if (!MilitaryUnitsAccounted.has(buildingId)) {
          const ability = def?.abilities?.find(
            (a: any) => a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility',
          );
          if (ability?.amount) {
            MilitaryUnitsAccounted.add(buildingId);
            City.MilitaryUnits += ability.amount * placedCount;
            dbg('[MilUnits] storage motivated', buildingId, 'x' + placedCount, '+' + (ability.amount * placedCount), '=', City.MilitaryUnits);
          }
          const comp = (def?.components as Record<string, any> | undefined)?.[MyInfo.era];
          if (comp) {
            const lookup: Record<string, any> = comp?.lookup?.rewards ?? {};
            const options: any[] = comp?.production?.options ?? [];
            let maxMilitary = 0;
            for (const option of options) {
              let optionMilitary = 0;
              for (const product of (option.products ?? [])) {
                if (product.type !== 'genericReward') continue;
                const id: string = product.reward?.id ?? '';
                if (id.startsWith('genb_random') && id.includes('unit_chest')) {
                  const amount: number | undefined = lookup[id]?.possible_rewards?.[0]?.reward?.amount;
                  if (typeof amount === 'number') optionMilitary += amount;
                } else if (id.startsWith('era_unit#')) {
                  const amount = parseInt(id.split('#')[3] ?? '0', 10);
                  if (amount > 0) optionMilitary += amount;
                }
              }
              if (optionMilitary > maxMilitary) maxMilitary = optionMilitary;
            }
            if (maxMilitary > 0) {
              MilitaryUnitsAccounted.add(buildingId);
              City.MilitaryUnits += maxMilitary * placedCount;
              dbg('[MilUnits] storage components', buildingId, 'x' + placedCount, '+' + (maxMilitary * placedCount), '=', City.MilitaryUnits);
            }
          }
        }
      }
      setMilitaryUnitsText();
    } else if (key == 'tool') {
      if (value.language != 'auto') {
        language = value.language;
        dbg(language);
      }
    } else if (key == 'targets') {
      targetsTopic = value;
      // dbg(targetsTopic);
    } else if (key == 'targetText') {
      targetText = value;
      // dbg(targetText);
    } else if (key == 'toolOptions') {
      setToolOptions(value);
      // dbg(toolOptions);
    } else if (key == 'donationPercent') {
      donationPercent = value;
      setCurrentPercent(value);
    } else if (key == 'donationSuffix') {
      donationSuffix = value;
    } else if (key == 'url') {
      url = value;
    } else dbg(key, value);
  });
  scheduleHudUpdate();
}

export function initTreasury(resources) {
  for (var i = 0; i < helper.numAges; i++) {
    ResourceDefs.forEach((rssDef) => {
      if (
        rssDef.era == helper.fAgefromLevel(helper.numAges - i) &&
        resources[rssDef.id]
      ) {
        GuildTreasury.push([
          rssDef.id,
          helper.fGVGagesname(rssDef.era),
          rssDef.name,
          resources[rssDef.id],
          0,
          0,
          0,
          0,
          0,
        ]);
      }
    });
  }
  dbg(GuildTreasury);
}

export function showReward(reward) {
  var rewardId = 'collectRewardText';
  var rewardTitle = '';
  var name = helper.fRewardShortName(reward.name);
  var qty = reward.amount;
  if (reward.totalAmount) qty = reward.totalAmount;
  if (reward.source == 'guildExpedition') {
    rewardTitle = 'GE ';
    rewardId = 'collectGERewardText';
    if (!rewardsGE[name]) rewardsGE[name] = 0;
    rewardsGE[name] += qty;
    dbg('rewardsGE:', rewardsGE, reward);
  } else if (reward.source == 'battlegrounds_conquest') {
    rewardTitle = 'GBG ';
    rewardId = 'collectGBGRewardText';
    if (!rewardsGBG[name]) rewardsGBG[name] = 0;
    rewardsGBG[name] += qty;
    dbg('rewardsGBG:', rewardsGBG, reward);
  } else if (
    reward.source == 'otherPlayer' ||
    reward.source == 'pickupProduction'
  ) {
    // reward already stored. so just show it
  } else {
    rewardTitle = 'Other ';
    rewardId = 'collectRewardText';
    if (reward.type == 'resource')
      name = helper.fResourceShortName(reward.subType);
    if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
    rewardsGeneric[name] += qty;
    dbg('rewardsGeneric:', rewardsGeneric, reward);
  }
  var text = '';
  if (Object.keys(rewardsGE).length) {
    text += '<p><em>GE</em><br>';
    Object.keys(rewardsGE).forEach((item) => {
      text += `${rewardsGE[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGBG).length) {
    text += '<p><em>GBG</em><br>';
    Object.keys(rewardsGBG).forEach((item) => {
      text += `${rewardsGBG[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsGeneric).length) {
    text += '<p><em>Event/City</em><br>';
    Object.keys(rewardsGeneric).forEach((item) => {
      text += `${rewardsGeneric[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsOtherPlayer).length) {
    text += '<p><em>Aid/Plunder</em><br>';
    Object.keys(rewardsOtherPlayer).forEach((item) => {
      text += `${rewardsOtherPlayer[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsCity).length) {
    text += '<p><em>City</em><br>';
    Object.keys(rewardsCity).forEach((item) => {
      text += `${rewardsCity[item]} ${item}<br>`;
    });
    text += '</p>';
  }
  if (Object.keys(rewardsArmy).length) {
    text += '<p><em>Army</em><br>';
    Object.keys(rewardsArmy).forEach((item) => {
      text += `${rewardsArmy[item]} ${item}<br>`;
    });
    text += '</p>';
  }

  cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-bs-toggle="collapse">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<strong><span data-i18n="reward">REWARDS:</span></strong></p>
	${element.close()}
	<div id="rewardsText" stype="height: 400px" class="overflow resize collapse ${
    collapse.collapseRewards ? '' : 'show'
  }">${text}</div></div>`;
  rewardObserve();
  document
    .getElementById('rewardsTextLabel')
    .addEventListener('click', collapse.fCollapseRewards);
}

export function showRewards(rewards) {
  var rewardTitle = '';
  var text = '';

  rewards.forEach((reward) => {
    var name = helper.fRewardShortName(reward.name);
    var qty = reward.amount;
    if (reward.source == 'autoAid') {
      rewardTitle = 'City ';
      if (reward.type == 'resource') {
        dbg('autoAid:resource', reward.subType, qty, reward);
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      } else if (reward.type == 'blueprint') {
        dbg(
          'autoAid:resource',
          helper.fGBsname(reward.subType) + ' ' + name,
          qty,
          reward,
        );
        if (rewardsCity[helper.fGBsname(reward.subType) + ' ' + name])
          rewardsCity[helper.fGBsname(reward.subType) + ' ' + name] += qty;
        else rewardsCity[helper.fGBsname(reward.subType) + ' ' + name] = qty;
      } else {
        if (rewardsCity[reward.subType]) rewardsCity[reward.subType] += qty;
        else rewardsCity[reward.subType] = qty;
      }

      dbg('autoAid:', rewardsCity, reward);
    } else {
      rewardTitle = 'Other ';
      if (reward.type == 'resource')
        name = helper.fResourceShortName(reward.subType);
      if (!rewardsGeneric[name]) rewardsGeneric[name] = 0;
      rewardsGeneric[name] += qty;
      dbg('rewardsGeneric:', rewardsGeneric, reward);
    }
    if (Object.keys(rewardsGE).length) {
      text += '<p><em>GE</em><br>';
      Object.keys(rewardsGE).forEach((item) => {
        text += `${rewardsGE[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsGBG).length) {
      text += '<p><em>GBG</em><br>';
      Object.keys(rewardsGBG).forEach((item) => {
        text += `${rewardsGBG[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsGeneric).length) {
      text += '<p><em>Event/City</em><br>';
      Object.keys(rewardsGeneric).forEach((item) => {
        text += `${rewardsGeneric[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsOtherPlayer).length) {
      text += '<p><em>Aid/Plunder</em><br>';
      Object.keys(rewardsOtherPlayer).forEach((item) => {
        text += `${rewardsOtherPlayer[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsCity).length) {
      text += '<p><em>City</em><br>';
      Object.keys(rewardsCity).forEach((item) => {
        text += `${rewardsCity[item]} ${item}<br>`;
      });
      text += '</p>';
    }
    if (Object.keys(rewardsArmy).length) {
      text += '<p><em>Army</em><br>';
      Object.keys(rewardsArmy).forEach((item) => {
        text += `${rewardsArmy[item]} ${item}<br>`;
      });
      text += '</p>';
    }
  });

  cityrewards.innerHTML = `<div class="alert alert-danger alert-dismissible show collapsed"><p id="rewardsTextLabel" href="#rewardsText" data-toggle="collapse">
  ${element.icon('rewardsicon', 'rewardsText', collapse.collapseRewards)}
	<span data-i18n="reward"><strong>REWARDS:</strong></span></p>
	${element.close()}
	<div id="rewardsText" class="overflow resize collapse ${collapse.collapseRewards ? '' : 'show'}">${text}</div></div>`;
  rewardObserve();
  document
    .getElementById('rewardsTextLabel')
    .addEventListener('click', collapse.fCollapseRewards);
}

function rewardObserve() {
  $('#rewards').i18n();
  const rewardDiv = document.getElementById('rewardsText');
  rewardDiv.addEventListener('mouseup', setHeight);
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.contentRect && entry.contentRect.height)
        heightRewards = entry.contentRect.height;
    }
  });
  resizeObserver.observe(rewardDiv);
  if ($('#rewardsText').height() > toolOptions.rewardSize) {
    $('#rewardsText').height(toolOptions.rewardSize);
  }
}

function accumulateMotivatedUnits(msg: any): void {
  const placedCount = PlacedBuildingCounts[msg.id] || 0;
  if (!placedCount) return;
  const ability = (msg.abilities as any[] | undefined)?.find(
    (a: any) => a.__class__ === 'RandomUnitOfAgeWhenMotivatedAbility',
  );
  if (ability?.amount) {
    City.MilitaryUnits += ability.amount * placedCount;
    dbg('[MilUnits] late motivated', msg.id, 'x' + placedCount, '+' + (ability.amount * placedCount), '=', City.MilitaryUnits);
    setMilitaryUnitsText();
  }
}

function extractBuildingBoostHints(msg: any): void {
  const components = msg.components;
  if (!components || typeof components !== 'object') return;
  for (const [era, comp] of Object.entries(components)) {
    const hints: BuildingBoostHint[] = [];

    const boosts: any[] = (comp as any)?.boosts?.boosts ?? [];
    hints.push(
      ...boosts
        .filter((b) => b.type && typeof b.value === 'number')
        .map((b) => ({ type: b.type, value: b.value, targetedFeature: b.targetedFeature ?? 'all' })),
    );

    const lookup: Record<string, any> = (comp as any)?.lookup?.rewards ?? {};
    const options: any[] = (comp as any)?.production?.options ?? [];
    let maxMilitary = 0;
    for (const option of options) {
      let optionMilitary = 0;
      for (const product of (option.products ?? [])) {
        if (product.type !== 'genericReward') continue;
        const id: string = product.reward?.id ?? '';
        if (id.startsWith('genb_random') && id.includes('unit_chest')) {
          const amount: number | undefined = lookup[id]?.possible_rewards?.[0]?.reward?.amount;
          if (typeof amount === 'number') optionMilitary += amount;
        } else if (id.startsWith('era_unit#')) {
          const amount = parseInt(id.split('#')[3] ?? '0', 10);
          if (amount > 0) optionMilitary += amount;
        }
      }
      if (optionMilitary > maxMilitary) maxMilitary = optionMilitary;
    }
    if (maxMilitary > 0) {
      hints.push({ type: 'military_unit_production', value: maxMilitary, targetedFeature: 'all' });
      if (era === MyInfo.era && !MilitaryUnitsAccounted.has(msg.id)) {
        const placedCount = PlacedBuildingCounts[msg.id] || 0;
        if (placedCount > 0) {
          MilitaryUnitsAccounted.add(msg.id);
          City.MilitaryUnits += maxMilitary * placedCount;
          dbg('[MilUnits] network components', msg.id, 'x' + placedCount, '+' + (maxMilitary * placedCount), '=', City.MilitaryUnits);
          setMilitaryUnitsText();
        }
      }
    }

    if (hints.length) {
      if (!BuildingBoostHints[msg.id]) BuildingBoostHints[msg.id] = {};
      BuildingBoostHints[msg.id][era] = hints;
    }
  }
}

function processMetadataEntry(msg) {
  if (
    msg.__class__ &&
    (msg.__class__ == 'CityEntityCulturalGoodsBuilding' ||
      msg.__class__ == 'CityEntityImpediment' ||
      msg.__class__ == 'CityEntityDiplomacy' ||
      msg.__class__ == 'CityEntityStaticProvider' ||
      msg.__class__ == 'CityEntityStreet' ||
      msg.__class__ == 'CityEntityHub' ||
      msg.__class__ == 'CityEntityOutpostShip' ||
      msg.__class__ == 'QuestTabMetadata' ||
      msg.__class__ == 'ChainMetadata' ||
      msg.__class__ == 'BuildingSetMetadata' ||
      msg.__class__ == 'InfoScreen' ||
      msg.type == 'off_grid')
  ) {
    return;
  } else if (msg.__class__ && msg.__class__.substring(0, 10) == 'CityEntity') {
    if (!CityEntityDefs[msg.id]) {
      CityEntityDefs[msg.id] = {
        name: msg.name,
        abilities: [],
        entity_levels: [],
        available_products: [],
      };
    }
    CityEntityDefs[msg.id] = msg;
    extractBuildingBoostHints(msg);
    accumulateMotivatedUnits(msg);
  } else if (msg.__class__ && msg.__class__ == 'GenericCityEntity') {
    if (!CityEntityDefs[msg.id]) {
      CityEntityDefs[msg.id] = {
        name: msg.name,
        abilities: [],
        entity_levels: [],
        available_products: [],
      };
    }
    CityEntityDefs[msg.id] = msg;
    extractBuildingBoostHints(msg);
    accumulateMotivatedUnits(msg);
  } else if (msg.__class__ && msg.__class__ == 'UnitType') {
    MilitaryDefs[msg.unitTypeId] = {
      name: msg.name,
      era: msg.minEra,
    };
  } else if (msg.__class__ && msg.__class__ == 'CastleSystemLevelMetadata') {
    CastleDefs.push(msg);
  } else if (msg.__class__ && msg.__class__ == 'SelectionKitMetadata') {
    SelectionKitDefs.push(msg);
  } else if (msg.__class__ && msg.__class__ == 'BoostMetadata') {
    BoostMetadataDefs.push(msg);
  } else if (
    msg.__class__ &&
    msg.__class__.substring(0, 18) == 'CityEntityCultural'
  ) {
    // ignore
  } else if (msg.__class__ && msg.__class__ == 'BuildingUpgrade') {
    // ignore
  } else if (msg.__class__ && msg.__class__ == 'CityMapEntity') {
    if (msg.id == 'W_MultiAge_WIN22A11b') {
      console.info(msg.name, msg);
    }
  } else if (!msg.__class__ || msg.__class__ == 'StaticData') {
    return;
  }
}

browser.runtime.onInstalled.addListener(handleInstalled);
function handleInstalled(details) {
  if (details.reason == 'install') {
    dbg(tool.name + ' installed!');
  } else if (details.reason == 'update') {
    dbg(
      tool.name +
        ' updated from ' +
        details.previousVersion +
        ' to ' +
        tool.version +
        '!',
    );
    alert(
      tool.name +
        ' updated from ' +
        details.previousVersion +
        ' to ' +
        tool.version +
        '!',
    );
  }
}

function toggleDebug() {
  debugEnabled = !debugEnabled;
  var logo = document.getElementById('logo');
  if (debugEnabled == true) {
    // logo.src = bug;
    logo.outerHTML = `<span class="material-icons-outlined" id="logo">bug_report</span>`;
  } else {
    logo.outerHTML = `<img src="/icons/Icon48.png" width="24" height="24" id="logo">`;
    // logo.src = "/icons/Icon48.png";
  }
  document.getElementById('logo').addEventListener('click', toggleDebug);
  dbg('toggleDebug', debugEnabled);
}

export function removeDebug() {
  document.getElementById('logo').removeEventListener('click', toggleDebug);
}

export function checkDebug() {
  return debugEnabled;
}

var heightRewards = toolOptions.rewardSize;
function setHeight() {
  dbg('mouseup', heightRewards);
  setRewardSize(heightRewards);
}

browser.runtime.onUpdateAvailable.addListener(handleUpdateAvailable);
function handleUpdateAvailable(details) {
  dbg('updating to version ' + details.version);
  alert('updating to version ' + details.version);
  browser.runtime.reload();
}

let requestingCheck = browser.runtime.requestUpdateCheck();
requestingCheck.then(onRequested, onError);

function onRequested(status, details) {
  if (status == 'update_available') {
    dbg('update pending...');
    console.log(details.version);
  } else if (status == 'no_update') {
    dbg('no update found');
  } else if (status == 'throttled') {
    dbg("Oops, I'm asking too frequently - I need to back off.");
  }
}

function onError(error) {
  console.log(`Error: ${error}`);
}
