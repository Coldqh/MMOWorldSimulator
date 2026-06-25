import { create } from "zustand";
import { createEmptyServer, createNewGame, ensureServerRoster } from "../engine/createNewGame";
import { createRng, uid } from "../engine/rng";
import {
  SAVE_VERSION,
  clearSave,
  loadGame,
  saveGame,
  flushSaveGame,
} from "../engine/saveLoad";
import { DUNGEONS, LOOT_TABLES, MOBS, RAIDS, SPOTS, ZONES, getDungeonById, getSpotById, getZoneById } from "../content/world";
import { getClassById } from "../content/classes";
import { ITEMS, getItemById, normalizeLegacyItemId, rarityLabel } from "../content/items";
import { getRaceById } from "../content/races";
import type {
  CombatState,
  GameModal,
  LootChoice,
  ScreenId,
  ServerNotification,
  ServerState,
} from "../types/game";
import {
  createPlayerCombatant,
  startSpotCombat,
  resolveCombatAction,
} from "../systems/combatSystem";
import {
  completeDungeonFloor,
  createDungeonRun,
  restInDungeon,
  resolveDungeonEventFloor,
  startDungeonFloorCombat,
} from "../systems/dungeonSystem";
import { simulateServerForMinutes } from "../systems/npcSystem";
import {
  cancelPartyListing as cancelPartyFinderListing,
  acceptPartyApplicant as acceptPartyFinderApplicant,
  rejectPartyApplicant as rejectPartyFinderApplicant,
  createPlayerPartyListing,
  joinPartyListing as joinPartyFinderListing,
  leavePartyListing as leavePartyFinderListing,
  refreshPartyFinderListings,
  startPartyFromListing,
  waitPartyListing as waitPartyFinderListing,
} from "../systems/partyFinderSystem";
import { enhanceItem, type EnhanceTarget } from "../systems/enhancementSystem";
import {
  buyListing,
  sellInventoryItem,
  normalizeMarketListings,
  generateMarketListings,
} from "../systems/marketSystem";
import {
  addInventoryItem,
  equipInventoryItem,
  equipmentEntries,
  getGearScore,
  getInstanceGearScore,
  getPlayerStats,
  normalizeInventory,
  socketCardIntoEquipment,
  socketCardIntoInventoryItem,
  getSocketSlotCount,
} from "../systems/itemSystem";
import { arenaRankIcon, arenaRankName, estimateArenaRatingValue, updateRankings } from "../systems/progressionSystem";
import { addNews } from "../engine/news";
import {
  acceptQuest as acceptQuestState,
  normalizeQuestStates,
  talkToQuestGiver as talkToQuestGiverState,
  turnInQuest as turnInQuestState,
  updateQuestProgressOnDungeonComplete,
  updateQuestProgressOnItemGain,
  updateQuestProgressOnMobKill,
  updateQuestProgressOnSystemAction,
} from "../systems/questSystem";

interface GameStore {
  server: ServerState;
  activeScreen: ScreenId;
  combat: CombatState | null;
  modal: GameModal | null;
  sidebarOpen: boolean;
  setScreen: (screen: ScreenId) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  closeModal: () => void;
  newGame: (name: string, raceId: string, classId: string) => void;
  resetGame: () => void;
  skipDay: () => void;
  exportSave: () => void;
  importSave: () => void;
  exportCharacter: () => void;
  importCharacter: (raw: string) => void;
  saveNow: () => void;
  travelToCity: () => void;
  travelToZone: (zoneId: string) => void;
  enterSpot: (spotId: string) => void;
  leaveSpot: () => void;
  startFarm: (spotId: string, mobId?: string) => void;
  startDungeon: (dungeonId: string) => void;
  refreshPartyFinder: () => void;
  createPartyListing: (dungeonId: string, visibility?: "public" | "guild_internal") => void;
  joinPartyListing: (listingId: string) => void;
  leavePartyListing: (listingId: string) => void;
  cancelPartyListing: (listingId: string) => void;
  startPartyListing: (listingId: string) => void;
  waitPartyListing: (listingId: string) => void;
  acceptPartyApplicant: (listingId: string, npcId: string) => void;
  rejectPartyApplicant: (listingId: string, npcId: string) => void;
  startDungeonFloor: () => void;
  restDungeonParty: () => void;
  leaveDungeonRun: () => void;
  startArena: () => void;
  combatAction: (actionId: string) => void;
  recoverFullHp: () => void;
  enhanceTarget: (target: EnhanceTarget) => void;
  equipItem: (itemId: string, enhancement?: number, cardIds?: string[]) => void;
  openItemProfile: (
    itemId: string,
    source?: "inventory" | "equipment" | "market" | "loot",
    enhancement?: number,
    cardIds?: string[],
  ) => void;
  resolveLootRoll: (choice: LootChoice) => void;
  buyMarketListing: (listingId: string) => void;
  sellItem: (itemId: string, enhancement?: number, cardIds?: string[]) => void;
  socketCard: (source: "equipment" | "inventory", itemIdOrSlot: string, cardId: string, enhancement?: number, cardIds?: string[]) => void;
  joinGuild: (guildId: string) => void;
  applyToGuild: (guildId: string) => void;
  leaveGuild: () => void;
  openNpcProfile: (npcId: string) => void;
  openGuildProfile: (guildId: string) => void;
  openGuildRoster: (guildId: string) => void;
  acceptQuest: (questId: string) => void;
  turnInQuest: (questId: string) => void;
  talkToQuestGiver: (giverId: string) => void;
}


const collectOwnedItemIds = (server: ServerState): string[] => {
  const ids = new Set<string>();
  Object.values(server.player?.equipment ?? {}).forEach((instance: any) => { if (instance?.itemId) ids.add(normalizeLegacyItemId(instance.itemId)); });
  (server.player?.inventory ?? []).forEach((entry) => ids.add(normalizeLegacyItemId(entry.itemId)));
  return Array.from(ids);
};

const addCollectionProgress = (server: ServerState, itemIds: string[] = [], mobIds: string[] = []): ServerState => {
  const current = server.collectionProgress ?? { obtainedItemIds: collectOwnedItemIds(server), defeatedMobIds: [] };
  return {
    ...server,
    collectionProgress: {
      obtainedItemIds: Array.from(new Set([...(current.obtainedItemIds ?? []), ...collectOwnedItemIds(server), ...itemIds.map(normalizeLegacyItemId)])),
      defeatedMobIds: Array.from(new Set([...(current.defeatedMobIds ?? []), ...mobIds])),
    },
  };
};

const notificationToModal = (notification: ServerNotification): GameModal => ({
  id: notification.id,
  type: notification.type,
  title: notification.title,
  text: notification.text,
  lines: notification.lines,
});


const normalizeEquipmentItemIds = (equipment: any = {}) => {
  const next: any = {};
  Object.entries(equipment).forEach(([slot, instance]: [string, any]) => {
    if (!instance) return;
    const itemId = normalizeLegacyItemId(instance.itemId);
    if (getItemById(itemId)) next[slot] = { ...instance, itemId };
  });
  return next;
};

const normalizeServer = (server: ServerState, mode: "full" | "light" = "full"): ServerState => {
  const needsMigration = server.version !== SAVE_VERSION;
  const characterCreated = server.characterCreated ?? true;
  const marketRng = createRng(
    (server.seed ?? Date.now()) + 1700 + (server.serverDay ?? 1),
  );
  const validRun =
    server.currentDungeonRun &&
    getDungeonById(server.currentDungeonRun.dungeonId)
      ? server.currentDungeonRun
      : undefined;

  const baseServer: ServerState = {
    ...server,
    version: SAVE_VERSION,
    characterCreated,
    location: server.location ?? { mode: "city" },
    player: {
      ...server.player,
      raceId: server.player.raceId ?? "human",
      arenaRating: needsMigration
        ? estimateArenaRatingValue(server.player.level ?? 1, getGearScore(normalizeEquipmentItemIds(server.player.equipment ?? {})), "PLAYER")
        : Number.isFinite(server.player.arenaRating)
          ? server.player.arenaRating
          : 1000,
      hp: Number.isFinite(server.player.hp) ? server.player.hp : 100,
      mana: Number.isFinite(server.player.mana) ? server.player.mana : 50,
      inventory: normalizeInventory(server.player.inventory ?? []),
      equipment: normalizeEquipmentItemIds(server.player.equipment ?? {}),
    },
    npcs: mode === "light" && !needsMigration
      ? (server.npcs ?? [])
      : (server.npcs ?? []).map((npc) => ({
          ...npc,
          raceId: npc.raceId ?? "human",
          arenaRating: Number.isFinite(npc.arenaRating) ? npc.arenaRating : 900,
        })),
    guilds: server.guilds ?? [],
    market: needsMigration ? [] : (server.market ?? []),
    worldNews: needsMigration ? [] : (server.worldNews ?? []).filter(
      (entry) => (entry.type as string) !== "siege" && !/фарм|фармит|уровень|апнул|повысил|рейд-прогресс|мета|лидер арены|высокий онлайн|рост влияния|потеря влияния/i.test(entry.text),
    ),
    rankings: {
      arenaTop: server.rankings?.arenaTop ?? [],
      raidRaceTop: server.rankings?.raidRaceTop ?? [],
      wealthTop: server.rankings?.wealthTop ?? [],
      gearTop: server.rankings?.gearTop ?? [],
      guildPvpTop: server.rankings?.guildPvpTop ?? [],
      guildReputationTop: server.rankings?.guildReputationTop ?? [],
    },
    unlockedContent: server.unlockedContent ?? ["greenfield", "moonwood"],
    guildApplications: server.guildApplications ?? [],
    partyFinderListings: server.partyFinderListings ?? [],
    notifications: server.notifications ?? [],
    serverWeek: server.serverWeek ?? Math.max(1, Math.ceil((server.serverDay ?? 1) / 7)),
    contentPatch: server.contentPatch ?? 1,
    metaTag: server.metaTag ?? "fresh_start",
    serverChronicle: server.serverChronicle ?? [],
    pendingLootRoll: needsMigration ? undefined : server.pendingLootRoll,
    currentDungeonRun: needsMigration ? undefined : (validRun ? { ...validRun, currentEncounterIndex: validRun.currentEncounterIndex ?? 0 } : undefined),
    currentPartyListingId: needsMigration ? undefined : server.currentPartyListingId,
    currentPartyListingId: needsMigration ? undefined : server.currentPartyListingId,
    collectionProgress: server.collectionProgress ?? { obtainedItemIds: [], defeatedMobIds: [] },
    questStates: server.questStates ?? {},
    location: server.location.mode !== 'city' && ['iron_quarry', 'skyfall_pass'].includes(server.location.zoneId ?? '') ? { mode: 'city' } : server.location,
  };
  const baseWithProgress = addCollectionProgress(baseServer);

  if (mode === "light" && !needsMigration) {
    return {
      ...baseWithProgress,
      worldNews: baseWithProgress.worldNews.slice(-80),
      market: baseWithProgress.market.length > 1200 ? baseWithProgress.market.slice(-1200) : baseWithProgress.market,
    };
  }

  const rosterReady = ensureServerRoster(baseWithProgress);
  const marketReady = needsMigration
    ? { ...rosterReady, market: generateMarketListings({ seed: rosterReady.seed, serverDay: rosterReady.serverDay, npcs: rosterReady.npcs }, marketRng) }
    : normalizeMarketListings(rosterReady, marketRng);
  const partyReady = refreshPartyFinderListings(marketReady, createRng((marketReady.seed ?? Date.now()) + 1900 + (marketReady.serverDay ?? 1)));
  return updateRankings(partyReady);
};

const savedServer = loadGame();
const initialServer = savedServer
  ? normalizeServer(savedServer)
  : createEmptyServer();

const commit = (
  set: (partial: Partial<GameStore>) => void,
  server: ServerState,
  combat?: CombatState | null,
  modal?: GameModal | null,
) => {
  let normalized = normalizeQuestStates(normalizeServer(server, "light"));
  let nextModal = modal;

  if (nextModal === undefined && normalized.notifications.length > 0) {
    const [first, ...rest] = normalized.notifications;
    normalized = { ...normalized, notifications: rest };
    nextModal = notificationToModal(first);
  }

  saveGame(normalized);
  set({
    server: normalized,
    ...(combat !== undefined ? { combat } : {}),
    ...(nextModal !== undefined ? { modal: nextModal } : {}),
  });
};

const makeRewardModal = (combat: CombatState, rngSeed: number): GameModal => ({
  id: `modal_reward_${rngSeed}_${combat.turn}`,
  type: combat.source === "dungeon" ? "dungeon" : "reward",
  title:
    combat.source === "dungeon"
      ? "Этаж пройден"
      : combat.source === "arena"
        ? "Победа на арене"
        : "Победа",
  text: combat.enemy.name,
  reward: combat.reward,
  lines: combat.reward?.lines ?? ["Добычи нет."],
});

const makeDeathModal = (combat: CombatState, rngSeed: number): GameModal => ({
  id: `modal_death_${rngSeed}_${combat.turn}`,
  type: "death",
  title: combat.source === "arena" ? "Поражение на арене" : "Смерть",
  text: combat.source === "dungeon" || combat.source === "raid" ? "Пати продолжает бой." : "Персонаж возвращён в город.",
  lines: combat.defeatLines ?? ["Возврат в город."],
});

const addMinutesToClock = (day: number, minute: number, add: number) => {
  const total = (day - 1) * 1440 + minute + add;
  return {
    day: Math.floor(total / 1440) + 1,
    minute: total % 1440,
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  server: initialServer,
  activeScreen: initialServer.characterCreated ? "world" : "start",
  combat: null,
  modal: null,
  sidebarOpen: false,

  setScreen: (screen) => {
    const { server } = get();
    if (screen === 'partyFinder') {
      const next = updateQuestProgressOnSystemAction(server, 'open_party_finder');
      commit(set, next, undefined);
    }
    set({ activeScreen: screen, sidebarOpen: false });
  },
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  closeSidebar: () => set({ sidebarOpen: false }),
  closeModal: () => set({ modal: null }),

  newGame: (name, raceId, classId) => {
    const cleanName = name.trim().slice(0, 18) || "Newbie";
    const next = createNewGame(cleanName, raceId, classId, Date.now(), true);
    commit(set, next, null, null);
    set({ activeScreen: "world" });
  },

  resetGame: () => {
    clearSave();
    const next = createEmptyServer();
    commit(set, next, null, null);
    set({ activeScreen: "start" });
  },

  travelToCity: () => {
    const { server, combat } = get();
    if (combat || !server.characterCreated) return;
    const next: ServerState = {
      ...server,
      location: { mode: "city" },
      currentDungeonRun: undefined,
    };
    commit(set, next, null);
    set({ activeScreen: "world" });
  },

  travelToZone: (zoneId) => {
    const { server, combat } = get();
    if (combat || !server.characterCreated || server.currentDungeonRun) return;
    const zone = getZoneById(zoneId);
    if (!zone) return;
    const rng = createRng(
      server.seed + server.serverDay * 1500 + server.currentMinute,
    );
    const moved: ServerState = {
      ...server,
      location: { mode: "zone", zoneId },
    };
    let next = simulateServerForMinutes(moved, 20, rng);
    if (zoneId === 'greenfield') next = updateQuestProgressOnSystemAction(next, 'visit_greenfield');
    commit(set, next, null);
    set({ activeScreen: "world" });
  },

  enterSpot: (spotId) => {
    const { server, combat } = get();
    if (combat || !server.characterCreated || server.currentDungeonRun) return;
    const spot = getSpotById(spotId);
    if (!spot) return;
    const rng = createRng(
      server.seed + server.serverDay * 1600 + server.currentMinute,
    );
    const moved: ServerState = {
      ...server,
      location: { mode: "spot", zoneId: spot.zoneId, spotId },
    };
    const next = simulateServerForMinutes(moved, 5, rng);
    commit(set, next, null);
    set({ activeScreen: "world" });
  },

  leaveSpot: () => {
    const { server, combat } = get();
    if (combat || !server.characterCreated) return;
    if (server.location.mode !== "spot" || !server.location.zoneId) return;
    const next: ServerState = {
      ...server,
      location: { mode: "zone", zoneId: server.location.zoneId },
    };
    commit(set, next, null);
    set({ activeScreen: "world" });
  },

  startFarm: (spotId, mobId) => {
    const { server } = get();
    if (!server.characterCreated || server.currentDungeonRun) return;
    if (server.location.mode !== "spot" || server.location.spotId !== spotId)
      return;
    const rng = createRng(
      server.seed + server.serverDay * 1000 + server.currentMinute,
    );
    const combat = startSpotCombat(server, spotId, rng, mobId);
    if (!combat) return;
    commit(set, server, combat, null);
  },

  startDungeon: (dungeonId) => {
    const { server, combat } = get();
    if (combat || !server.characterCreated || server.currentDungeonRun) return;
    const dungeon = getDungeonById(dungeonId);
    if (!dungeon) return;
    const rng = createRng(
      server.seed + server.serverDay * 2000 + server.currentMinute,
    );

    if (
      server.location.mode === "city" ||
      server.location.zoneId !== dungeon.zoneId
    ) {
      const zone = getZoneById(dungeon.zoneId);
      const next = addNews(
        server,
        rng,
        "dungeon",
        `${dungeon.name}: нужна локация ${zone?.name ?? dungeon.zoneId}.`,
        false,
      );
      commit(set, next, null);
      return;
    }

    if (server.player.level < dungeon.levelRange[0]) {
      const next = addNews(
        server,
        rng,
        "dungeon",
        `${dungeon.name}: нужен Lv. ${dungeon.levelRange[0]}.`,
        false,
      );
      commit(set, next, null);
      return;
    }

    const result = createPlayerPartyListing(server, dungeonId, rng, "public");
    commit(set, result.server, undefined, result.modal);
    set({ activeScreen: "partyFinder" });
  },

  startDungeonFloor: () => {
    const { server, combat } = get();
    if (combat || !server.currentDungeonRun) return;
    const rng = createRng(
      server.seed +
        server.serverDay * 2100 +
        server.currentMinute +
        server.currentDungeonRun.currentFloor * 31,
    );
    const dungeon = getDungeonById(server.currentDungeonRun.dungeonId);
    const floor = dungeon?.floors[server.currentDungeonRun.currentFloor];
    if (!dungeon || !floor) return;

    if (floor.type === "event") {
      const result = resolveDungeonEventFloor(server, rng);
      const next = simulateServerForMinutes(result.server, result.minutes, rng);
      commit(set, next, null, result.modal);
      return;
    }

    const combatState = startDungeonFloorCombat(server, rng);
    if (!combatState) return;
    const next: ServerState = {
      ...server,
      currentDungeonRun: { ...server.currentDungeonRun, status: "inCombat" },
    };
    commit(set, next, combatState, null);
  },

  restDungeonParty: () => {
    const { server, combat } = get();
    if (combat || !server.currentDungeonRun) return;
    const rng = createRng(
      server.seed + server.serverDay * 2200 + server.currentMinute,
    );
    const rested = restInDungeon(server);
    const next = rested.server;
    commit(set, next, null, {
      id: `modal_dungeon_rest_${server.currentDungeonRun.id}_${server.currentMinute}`,
      type: "dungeon",
      title: "Отдых между этажами",
      text: `Без траты времени`,
      lines: ["HP восстановлены.", "Mana восстановлена."],
    });
  },

  leaveDungeonRun: () => {
    const { server, combat } = get();
    if (combat) return;
    commit(set, { ...server, currentDungeonRun: undefined, currentPartyListingId: undefined }, null, {
      id: `modal_leave_dungeon_${server.seed}_${server.currentMinute}`,
      type: "dungeon",
      title: "Данж покинут",
      text: "Пати распущена.",
      lines: ["Прогресс данжа сброшен."],
    });
  },

  startArena: () => {
    const { server, combat } = get();
    if (combat || !server.characterCreated || server.currentDungeonRun) return;
    const rng = createRng(
      server.seed + server.serverDay * 3000 + server.currentMinute,
    );
    if (server.location.mode !== "city") {
      const next = addNews(
        server,
        rng,
        "pvp",
        "Арена доступна в городе.",
        false,
      );
      commit(set, next, null);
      set({ activeScreen: "world" });
      return;
    }
    const playerGear = getGearScore(server.player.equipment);
    const candidates = server.npcs
      .filter((npc) => ['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus))
      .filter((npc) => server.player.level >= 20 ? npc.level === 20 : Math.abs(npc.level - server.player.level) <= 1)
      .filter((npc) => Math.abs(npc.arenaRating - server.player.arenaRating) <= 300)
      .filter((npc) => Math.abs(npc.gearScore - playerGear) <= Math.max(180, playerGear * 0.38))
      .sort((a, b) =>
        (Math.abs(a.arenaRating - server.player.arenaRating) + Math.abs(a.gearScore - playerGear) * 0.8) -
        (Math.abs(b.arenaRating - server.player.arenaRating) + Math.abs(b.gearScore - playerGear) * 0.8),
      );
    const fallbackPool = server.npcs.filter((npc) => ['PVP_PLAYER', 'HARDCORE', 'GUILD_PLAYER', 'LEADER'].includes(npc.roleFocus)).filter((npc) => server.player.level >= 20 ? npc.level === 20 : Math.abs(npc.level - server.player.level) <= 1);
    const pool = candidates.length >= 4 ? candidates.slice(0, 18) : fallbackPool;
    const opponent = rng.pick(pool.length > 0 ? pool : server.npcs);
    const opponentStats = getPlayerStats({ ...server.player, id: opponent.id, name: opponent.name, raceId: opponent.raceId, classId: opponent.classId, level: opponent.level, xp: 0, gold: opponent.gold, inventory: opponent.inventory, equipment: opponent.equipment, guildId: opponent.guildId, reputation: opponent.reputation, arenaRating: opponent.arenaRating });
    const buildArenaFighter = (base: ReturnType<typeof createPlayerCombatant>, gearScore: number) => {
      const role = base.classId === 'warrior' ? 'tank' : base.classId === 'priest' ? 'healer' : 'dps';
      const mainOffense = base.classId === 'mage' || base.classId === 'priest' ? base.magic : base.attack;
      const gearBonus = Math.sqrt(Math.max(0, gearScore));
      let maxHp = Math.round(base.maxHp * 2.05 + gearBonus * 5);
      let attack = Math.round(mainOffense * 0.78 + gearBonus * 0.9);
      let magic = Math.round(base.magic * 0.78 + gearBonus * 0.75);
      let defense = Math.round(base.defense * 0.82 + gearBonus * 0.55);
      if (role === 'tank') {
        maxHp = Math.round(maxHp * 1.13);
        attack = Math.round(attack * 0.84);
        magic = Math.round(magic * 0.75);
        defense = Math.round(defense * 1.22);
      } else if (role === 'healer') {
        maxHp = Math.round(maxHp * 0.98);
        attack = Math.round(attack * 0.72);
        magic = Math.round(magic * 0.9);
        defense = Math.round(defense * 0.82);
      } else {
        maxHp = Math.round(maxHp * 0.96);
        attack = Math.round(attack * 1.12);
        magic = Math.round(magic * (base.classId === 'mage' ? 1.15 : 0.82));
        defense = Math.round(defense * 0.88);
      }
      const defenseCap = Math.round(Math.max(18, attack) * (role === 'tank' ? 1.85 : role === 'healer' ? 1.25 : 1.35));
      defense = Math.min(defense, defenseCap);
      const hp = Math.round(Math.min(base.hp / Math.max(1, base.maxHp), 1) * maxHp);
      return {
        ...base,
        maxHp,
        hp: Math.max(1, hp),
        attack: Math.max(4, attack),
        magic: Math.max(3, magic),
        defense: Math.max(3, defense),
      };
    };
    const opponentBase = {
      id: opponent.id,
      name: opponent.name,
      level: opponent.level,
      classId: opponent.classId,
      maxHp: opponentStats.hp,
      hp: opponentStats.hp,
      maxMana: opponentStats.mana,
      mana: opponentStats.mana,
      attack: opponentStats.attack,
      magic: opponentStats.magic,
      defense: opponentStats.defense,
      speed: opponentStats.speed,
      shield: 0,
      cooldowns: {},
      defending: false,
    };
    const arenaPlayer = buildArenaFighter(createPlayerCombatant(server), playerGear);
    const arenaEnemy = buildArenaFighter(opponentBase, opponent.gearScore);
    const arenaCombat: CombatState = {
      id: uid("arena", rng),
      source: "arena",
      sourceId: "arena_ladder",
      enemyNpcId: opponent.id,
      player: arenaPlayer,
      enemy: arenaEnemy,
      partyNpcIds: [],
      turn: 1,
      log: [`Арена. Противник: ${opponent.name} · рейтинг ${opponent.arenaRating}.`],
      status: "active",
    };
    commit(set, server, arenaCombat, null);
  },

  combatAction: (actionId) => {
    const { server, combat } = get();
    if (!combat) return;
    const rng = createRng(
      server.seed +
        server.serverDay * 4000 +
        server.currentMinute +
        combat.turn * 17,
    );
    const result = resolveCombatAction(server, combat, actionId, rng);
    let nextServer = result.server;
    let nextCombat: CombatState | null = result.combat;
    let modal: GameModal | null = null;

    if (result.combat.status !== "active") {
      if (
        result.combat.status === "victory" &&
        (result.combat.source === "dungeon" || result.combat.source === "raid") &&
        typeof result.combat.dungeonFloorIndex === "number"
      ) {
        const beforeRunId = nextServer.currentDungeonRun?.id;
        nextServer = completeDungeonFloor(
          nextServer,
          result.combat.dungeonFloorIndex,
        );
        if (beforeRunId && !nextServer.currentDungeonRun) {
          nextServer = updateQuestProgressOnDungeonComplete(nextServer, result.combat.sourceId);
        }
      }
      if (
        result.combat.status === "defeat" &&
        (result.combat.source === "dungeon" || result.combat.source === "raid")
      ) {
        nextServer = { ...nextServer, currentDungeonRun: nextServer.currentDungeonRun };
      }

      const dungeon =
        result.combat.source === "dungeon"
          ? getDungeonById(result.combat.sourceId)
          : undefined;
      const floor =
        dungeon && typeof result.combat.dungeonFloorIndex === "number"
          ? dungeon.floors[result.combat.dungeonFloorIndex]
          : undefined;
      const timeCost =
        result.combat.source === "spot"
          ? (getSpotById(result.combat.sourceId)?.timeCostMinutes ?? 60)
          : result.combat.source === "dungeon"
            ? Math.max(8, Math.ceil((floor?.timeCostMinutes ?? 35) / Math.max(1, floor?.mobIds.length ?? 1)))
            : 30;

      if (result.combat.status === "victory") {
        const defeated = result.combat.enemyMobIds && result.combat.enemyMobIds.length > 0
          ? result.combat.enemyMobIds
          : result.combat.enemyMobId
            ? [result.combat.enemyMobId]
            : [];
        const obtained = result.combat.reward?.items?.map((entry) => entry.itemId) ?? [];
        defeated.forEach((mobId) => { nextServer = updateQuestProgressOnMobKill(nextServer, mobId); });
        result.combat.reward?.items?.forEach((entry) => { nextServer = updateQuestProgressOnItemGain(nextServer, entry.itemId, entry.amount); });
        nextServer = addCollectionProgress(nextServer, obtained, defeated);
      }

      nextServer = simulateServerForMinutes(nextServer, timeCost, rng);
      modal =
        result.combat.status === "victory"
          ? makeRewardModal(result.combat, server.seed + server.currentMinute)
          : makeDeathModal(result.combat, server.seed + server.currentMinute);
      nextCombat = null;

      if (result.combat.status === "defeat" && result.combat.source !== 'dungeon' && result.combat.source !== 'raid') set({ activeScreen: "world" });
    }

    commit(set, nextServer, nextCombat, modal);
  },

  recoverFullHp: () => {
    const { server, combat } = get();
    if (combat || !server.characterCreated) return;
    const stats = getPlayerStats(server.player);
    const missingHp = Math.max(
      0,
      stats.hp - Math.min(server.player.hp, stats.hp),
    );
    const missingMana = Math.max(
      0,
      stats.mana - Math.min(server.player.mana, stats.mana),
    );
    const minutes = Math.max(
      5,
      Math.ceil(missingHp / 4) + Math.ceil(missingMana / 8),
    );
    const rng = createRng(
      server.seed + server.serverDay * 5000 + server.currentMinute,
    );
    let next = simulateServerForMinutes(server, minutes, rng);
    next = {
      ...next,
      player: { ...next.player, hp: stats.hp, mana: stats.mana },
    };
    commit(set, next, null, {
      id: `modal_recover_${server.seed}_${server.currentMinute}`,
      type: "system",
      title: "Восстановление",
      text: `${minutes} мин.`,
      lines: [
        `HP: ${stats.hp}/${stats.hp}.`,
        `Mana: ${stats.mana}/${stats.mana}.`,
      ],
    });
  },


  skipDay: () => {
    const { server, combat } = get();
    if (combat || !server.characterCreated) return;
    const rng = createRng(server.seed + server.serverDay * 12000 + server.currentMinute);
    const minutes = 1440 - server.currentMinute;
    let next = simulateServerForMinutes(server, minutes <= 0 ? 1440 : minutes, rng);
    const stats = getPlayerStats(next.player);
    next = { ...next, player: { ...next.player, hp: stats.hp, mana: stats.mana } };
    commit(set, next, null, {
      id: `modal_skip_day_${server.serverDay}_${server.currentMinute}`,
      type: 'system',
      title: 'День пропущен',
      text: `День ${next.serverDay}`,
      lines: ['HP и Mana восстановлены.'],
    });
  },

  exportSave: () => {
    const raw = JSON.stringify(get().server);
    navigator.clipboard?.writeText(raw).catch(() => undefined);
    set({ modal: { id: `modal_export_${Date.now()}`, type: 'settings', title: 'Экспорт сейва', text: 'Сейв скопирован в буфер.', lines: [raw.slice(0, 160) + '...'] } });
  },

  importSave: () => {
    const raw = window.prompt('Вставь JSON сейва');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ServerState;
      const normalized = normalizeServer(parsed);
      commit(set, normalized, null, { id: `modal_import_${Date.now()}`, type: 'settings', title: 'Импорт сейва', text: 'Сейв загружен.', lines: [`NPC: ${normalized.npcs.length}`, `Предметов в базе: ${ITEMS.length}`] });
      set({ activeScreen: 'world' });
    } catch {
      set({ modal: { id: `modal_import_error_${Date.now()}`, type: 'settings', title: 'Ошибка импорта', text: 'JSON не прочитан.', lines: ['Проверь строку сейва.'] } });
    }
  },

  exportCharacter: () => {
    const { server } = get();
    const characterExport = {
      type: 'MMOWS_CHARACTER_EXPORT',
      exportVersion: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      player: server.player,
      collectionProgress: server.collectionProgress,
    };
    const raw = JSON.stringify(characterExport, null, 2);
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${server.player.name || 'character'}_mmows_character.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    set({ modal: { id: `modal_character_export_${Date.now()}`, type: 'settings', title: 'Персонаж сохранён', text: server.player.name, lines: ['Файл экспорта персонажа скачан.'] } });
  },

  importCharacter: (raw) => {
    try {
      const parsed = JSON.parse(raw);
      const importedPlayer = parsed?.player;
      if (!importedPlayer || parsed?.type !== 'MMOWS_CHARACTER_EXPORT') throw new Error('bad character export');
      const { server } = get();
      const player = {
        ...server.player,
        ...importedPlayer,
        id: 'player',
        inventory: normalizeInventory(importedPlayer.inventory ?? []),
        equipment: normalizeEquipmentItemIds(importedPlayer.equipment ?? {}),
      };
      const next = normalizeServer({
        ...server,
        player,
        collectionProgress: parsed.collectionProgress ?? server.collectionProgress,
      });
      commit(set, next, null, { id: `modal_character_import_${Date.now()}`, type: 'settings', title: 'Персонаж импортирован', text: player.name, lines: [`Lv. ${player.level}`, `Gold: ${player.gold}`, `Gear: ${getGearScore(player.equipment)}`] });
      set({ activeScreen: 'character' });
    } catch {
      set({ modal: { id: `modal_character_import_error_${Date.now()}`, type: 'settings', title: 'Ошибка импорта персонажа', text: 'Файл не прочитан.', lines: ['Нужен JSON-файл экспорта персонажа.'] } });
    }
  },

  saveNow: () => {
    const { server } = get();
    saveGame(server);
    flushSaveGame();
    set({ modal: { id: `modal_save_now_${Date.now()}`, type: 'settings', title: 'Сохранено', text: 'Сейв записан.', lines: [`save v${SAVE_VERSION}`] } });
  },

  enhanceTarget: (target) => {
    const { server } = get();
    const rng = createRng(
      server.seed + server.serverDay * 6000 + server.currentMinute,
    );
    const result = enhanceItem(server, target, rng);
    let next = simulateServerForMinutes(result.server, 10, rng);
    next = updateQuestProgressOnSystemAction(next, 'enhance_item');
    commit(set, next, undefined, result.modal);
  },

  equipItem: (itemId, enhancement = 0, cardIds = []) => {
    const { server } = get();
    const player = equipInventoryItem(
      server.player,
      itemId,
      server.seed + server.currentMinute,
      enhancement,
      cardIds,
    );
    commit(set, { ...server, player });
  },

  openItemProfile: (itemId, source = "inventory", enhancement = 0, cardIds = []) => {
    const { server } = get();
    const item = getItemById(itemId);
    if (!item) return;
    const classText =
      item.classTags.length === 0
        ? "любой"
        : item.classTags.map((id) => getClassById(id)?.name ?? id).join(", ");
    const statLines = Object.entries(item.stats).map(
      ([key, value]) =>
        `${key.toUpperCase()} ${Number(value) >= 0 ? "+" : ""}${value}`,
    );
    const canEnhance =
      source === "inventory" &&
      Boolean(item.slot) &&
      server.location.mode === "city";
    const lines = [
      `Gear Score: ${getInstanceGearScore(item, enhancement, cardIds)}.`,
      `Уровень предмета: ${item.levelReq}.`,
      `Класс: ${classText}.`,
      `Слот: ${item.slot ?? "нет"}.`,
      `Редкость: ${item.rarity}.`,
      `Заточка: +${enhancement}.`,
      item.slot ? `ACTION_SOCKET_STATE:${cardIds.join(',') || '-'}:${getSocketSlotCount(item, { itemId, enhancement, cardIds })}` : 'Слоты карт: нет.',
      `Слоты карт: ${item.slot ? `${cardIds.length}/${getSocketSlotCount(item, { itemId, enhancement, cardIds })}` : 'нет'}.`,
      statLines.length > 0
        ? `Бонусы: ${statLines.join(" · ")}.`
        : "Бонусы: нет.",
      `Торгуемый: ${item.tradeable ? "да" : "нет"}.`,
    ];
    if (source === "inventory" && item.slot && server.location.mode !== "city")
      lines.push("Заточка доступна только в городе.");
    const socketCount = item.slot ? getSocketSlotCount(item, { itemId, enhancement, cardIds }) : 0;
    const availableCards = server.player.inventory.filter((entry) => getItemById(entry.itemId)?.type === 'card');
    if (item.slot && server.location.mode === 'city' && cardIds.length < socketCount && availableCards.length > 0) {
      availableCards.slice(0, 8).forEach((card) => {
        const cardItem = getItemById(card.itemId);
        if (source === 'equipment' && item.slot) lines.push(`ACTION_SOCKET_EQUIPMENT:${item.slot}:${card.itemId}:${cardItem?.name ?? card.itemId}`);
        if (source === 'inventory') lines.push(`ACTION_SOCKET_INVENTORY:${itemId}:${enhancement}:${cardIds.join(',') || '-'}:${card.itemId}:${cardItem?.name ?? card.itemId}`);
      });
    }
    set({
      modal: {
        id: `modal_item_${itemId}_${enhancement}_${source}`,
        type: "item",
        title: item.name,
        text:
          source === "inventory"
            ? "Инвентарь"
            : source === "equipment"
              ? "Экипировка"
              : source === "market"
                ? "Рынок"
                : "Лут",
        rarity: item.rarity,
        itemId: item.id,
        lines: canEnhance
          ? [...lines, `ACTION_ENHANCE_INVENTORY:${itemId}:${enhancement}`]
          : lines,
      },
    });
  },

  resolveLootRoll: (choice) => {
    const { server } = get();
    const pending = server.pendingLootRoll;
    if (!pending) return;
    const rng = createRng(
      server.seed + server.serverDay * 9100 + server.currentMinute,
    );
    const item = getItemById(pending.itemId);
    if (!item) {
      commit(set, { ...server, pendingLootRoll: undefined }, undefined, null);
      return;
    }
    const npcRolls = pending.partyNpcIds.map((id) => {
      const npc = server.npcs.find((entry) => entry.id === id);
      const usable =
        item.classTags.length === 0 ||
        item.classTags.includes(npc?.classId ?? "");
      const npcChoice: LootChoice = usable
        ? "need"
        : rng.chance(0.45)
          ? "want"
          : "pass";
      const roll =
        npcChoice === "pass"
          ? 0
          : rng.int(1, 100) + (npcChoice === "need" ? 100 : 0);
      return { id, name: npc?.name ?? id, choice: npcChoice, roll };
    });
    const playerRoll =
      choice === "pass" ? 0 : rng.int(1, 100) + (choice === "need" ? 100 : 0);
    const all = [
      {
        id: server.player.id,
        name: server.player.name,
        choice,
        roll: playerRoll,
      },
      ...npcRolls,
    ];
    const winner = [...all].sort((a, b) => b.roll - a.roll)[0];
    let next: ServerState = { ...server, pendingLootRoll: undefined };
    const lines = [
      `Выпало: ${item.name}.`,
      `${server.player.name}: ${choice === "need" ? "Нужно" : choice === "want" ? "Хочу" : "Отказ"} · ${choice === "pass" ? "-" : playerRoll % 100 || 100}`,
    ];
    npcRolls.forEach((entry) =>
      lines.push(
        `${entry.name}: ${entry.choice === "need" ? "Нужно" : entry.choice === "want" ? "Хочу" : "Отказ"}${entry.choice === "pass" ? "" : ` · ${entry.roll % 100 || 100}`}`,
      ),
    );
    if (winner.id === server.player.id && choice !== "pass") {
      next = {
        ...next,
        player: {
          ...next.player,
          inventory: addInventoryItem(next.player.inventory, item.id, 1, 0),
        },
      };
      next = addCollectionProgress(next, [item.id], []);
      next = addNews(
        next,
        rng,
        "drop",
        `${server.player.name} выиграл ролл: ${item.name}.`,
        item.announceIfDropped,
      );
      lines.push("Итог: предмет забрал ты.");
    } else {
      lines.push(`Итог: предмет забрал ${winner.name}.`);
    }
    commit(set, next, undefined, {
      id: `modal_loot_result_${pending.id}`,
      type: "loot",
      title: "Ролл завершён",
      text: item.name,
      rarity: item.rarity,
      itemId: item.id,
      lines,
    });
  },

  buyMarketListing: (listingId) => {
    const { server } = get();
    commit(set, buyListing(server, listingId));
  },

  sellItem: (itemId, enhancement = 0, cardIds = []) => {
    const { server } = get();
    const rng = createRng(
      server.seed + server.serverDay * 7000 + server.currentMinute,
    );
    commit(set, sellInventoryItem(server, itemId, rng, enhancement, cardIds));
  },


  socketCard: (source, itemIdOrSlot, cardId, enhancement = 0, cardIds = []) => {
    const { server } = get();
    if (server.location.mode !== 'city') return;
    const player = source === 'equipment'
      ? socketCardIntoEquipment(server.player, itemIdOrSlot as any, cardId)
      : socketCardIntoInventoryItem(server.player, itemIdOrSlot, enhancement, cardIds, cardId);
    commit(set, { ...server, player }, undefined, {
      id: `modal_socket_${Date.now()}`,
      type: 'item',
      title: 'Карта вставлена',
      text: getItemById(cardId)?.name ?? cardId,
      lines: ['Бонус карты теперь учитывается в статах и Gear Score.'],
    });
  },

  refreshPartyFinder: () => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13000 + server.currentMinute);
    commit(set, refreshPartyFinderListings(server, rng));
  },

  createPartyListing: (dungeonId, visibility = "public") => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13100 + server.currentMinute);
    const result = createPlayerPartyListing(server, dungeonId, rng, visibility);
    commit(set, result.server, undefined, result.modal);
    if (result.server.currentPartyListingId) set({ activeScreen: "partyFinder" });
  },

  joinPartyListing: (listingId) => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13200 + server.currentMinute);
    const result = joinPartyFinderListing(server, listingId, rng);
    commit(set, result.server, undefined, result.modal);
    if (result.server.currentPartyListingId) set({ activeScreen: "partyFinder" });
  },

  leavePartyListing: (listingId) => {
    const { server } = get();
    commit(set, leavePartyFinderListing(server, listingId));
  },

  cancelPartyListing: (listingId) => {
    const { server } = get();
    commit(set, cancelPartyFinderListing(server, listingId));
  },

  waitPartyListing: (listingId) => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13400 + server.currentMinute + (server.partyFinderListings.find((listing) => listing.id === listingId)?.waitAttempts ?? 0) * 17);
    const result = waitPartyFinderListing(server, listingId, rng);
    commit(set, result.server, undefined, result.modal);
  },

  startPartyListing: (listingId) => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13300 + server.currentMinute);
    const result = startPartyFromListing(server, listingId, rng);
    commit(set, result.server, null, result.modal);
    if (result.server.currentDungeonRun) set({ activeScreen: result.server.currentDungeonRun.contentType === "raid" ? "raid" : "dungeon" });
  },

  acceptPartyApplicant: (listingId, npcId) => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13500 + server.currentMinute + npcId.length);
    const result = acceptPartyFinderApplicant(server, listingId, npcId, rng);
    commit(set, result.server, undefined, result.modal);
  },

  rejectPartyApplicant: (listingId, npcId) => {
    const { server } = get();
    const rng = createRng(server.seed + server.serverDay * 13600 + server.currentMinute + npcId.length);
    const result = rejectPartyFinderApplicant(server, listingId, npcId, rng);
    commit(set, result.server, undefined, result.modal);
  },

  joinGuild: (guildId) => get().applyToGuild(guildId),

  applyToGuild: (guildId) => {
    const { server } = get();
    const guild = server.guilds.find((entry) => entry.id === guildId);
    if (!guild || server.player.guildId) return;
    if (server.player.level < (guild.minLevel ?? 1)) {
      set({ modal: { id: `modal_guild_level_${guild.id}`, type: "guild", title: "Недоступно", text: guild.name, lines: [`Нужен уровень ${guild.minLevel ?? 1}.`] } });
      return;
    }
    const next = {
      ...server,
      player: { ...server.player, guildId: guild.id },
      guildApplications: server.guildApplications.filter((entry) => entry.guildId !== guild.id),
      guilds: server.guilds.map((entry) => entry.id === guild.id ? { ...entry, memberIds: [...new Set([...entry.memberIds, server.player.id])] } : entry),
    };
    commit(set, next, undefined, {
      id: `modal_guild_join_${guild.id}`,
      type: "guild",
      title: "Ты принят",
      text: guild.name,
      lines: [`Гильдия: ${guild.name}.`, `ГМ: ${server.npcs.find((npc) => npc.id === guild.leaderId)?.name ?? 'нет'}.`],
    });
  },

  leaveGuild: () => {
    const { server } = get();
    if (!server.player.guildId) return;
    const guildId = server.player.guildId;
    const guild = server.guilds.find((entry) => entry.id === guildId);
    const next: ServerState = {
      ...server,
      player: { ...server.player, guildId: undefined },
      guilds: server.guilds.map((entry) =>
        entry.id === guildId
          ? {
              ...entry,
              memberIds: entry.memberIds.filter(
                (id) => id !== server.player.id,
              ),
              stability: Math.max(0, entry.stability - 2),
            }
          : entry,
      ),
    };
    commit(set, next, undefined, {
      id: `modal_leave_guild_${server.currentMinute}`,
      type: "guild",
      title: "Гильдия покинута",
      text: guild?.name ?? guildId,
      lines: ["Ты больше не состоишь в гильдии."],
    });
  },

  acceptQuest: (questId) => {
    const { server } = get();
    const next = acceptQuestState(server, questId);
    commit(set, next, undefined, {
      id: `modal_accept_quest_${questId}_${server.currentMinute}`,
      type: 'system',
      title: 'Квест принят',
      text: questId,
      lines: ['Задание добавлено в журнал.'],
    });
  },

  turnInQuest: (questId) => {
    const { server } = get();
    const result = turnInQuestState(server, questId);
    commit(set, result.server, undefined, result.notification ? {
      id: result.notification.id,
      type: result.notification.type,
      title: result.notification.title,
      text: result.notification.text,
      lines: result.notification.lines,
    } : undefined);
  },

  talkToQuestGiver: (giverId) => {
    const { server } = get();
    const next = talkToQuestGiverState(server, giverId);
    commit(set, next, undefined);
  },

  openNpcProfile: (npcId) => {
    const { server } = get();
    const npc = server.npcs.find((entry) => entry.id === npcId);
    if (!npc) return;
    const race = getRaceById(npc.raceId)?.name ?? npc.raceId;
    const className = getClassById(npc.classId)?.name ?? npc.classId;
    const guild = npc.guildId
      ? server.guilds.find((entry) => entry.id === npc.guildId)
      : undefined;
    const roleText: Record<string, string> = {
      PVE_FARMER: "PvE фарм",
      RAIDER: "рейды",
      PVP_PLAYER: "PvP",
      GUILD_PLAYER: "гильдии",
      COLLECTOR: "коллекции",
      TRADER: "рынок",
      CASUAL: "казуал",
      HARDCORE: "хардкор",
      LEADER: "лидер",
      DRAMA: "конфликты",
    };
    const equipmentLines = equipmentEntries(npc.equipment ?? {}).map(({ slot, instance }) => {
      const item = getItemById(instance.itemId);
      const label = `${slot}: ${item?.name ?? instance.itemId}${instance.enhancement > 0 ? ` +${instance.enhancement}` : ''}${item ? ` · Lv. ${item.levelReq}` : ''}`;
      return `ACTION_NPC_ITEM|${instance.itemId}|${instance.enhancement}|${item?.rarity ?? 'common'}|${label}`;
    });
    const gearScore = getGearScore(npc.equipment ?? {});
    const modal: GameModal = {
      id: `modal_npc_${npc.id}`,
      type: "npc",
      title: npc.name,
      text: `Lv. ${npc.level} · ${race} · ${className} · Gear ${gearScore}`,
      lines: [
        guild ? `ACTION_GUILD_PROFILE:${guild.id}:${guild.name}` : `Гильдия: нет`,
        `Ранг арены: ${arenaRankIcon(npc.arenaRating)} ${arenaRankName(npc.arenaRating)} · ${npc.arenaRating}`,
        `Фокус: ${roleText[npc.roleFocus] ?? npc.roleFocus}`,
        `Цель: ${npc.currentGoal}`,
        `Арена: ${npc.arenaRating}`,
        `Репутация: ${npc.reputation}`,
        `Золото: ${npc.gold}g`,
        `Активность: ${npc.activityLevel}/10`,
        `Амбиции: ${npc.ambition}/10`,
        `Риск: ${npc.risk}/10`,
        `Gear Score: ${gearScore}`,
        ...equipmentLines,
      ],
    };
    set({ modal });

  },

  openGuildRoster: (guildId) => {
    const { server } = get();
    const guild = server.guilds.find((entry) => entry.id === guildId);
    if (!guild) return;
    const roleWeight = (id: string) => guild.leaderId === id ? 0 : guild.deputyId === id ? 1 : (guild.officerIds ?? []).includes(id) ? 2 : 3;
    const members = guild.memberIds
      .map((id) => id === server.player.id ? server.player : server.npcs.find((npc) => npc.id === id))
      .filter(Boolean)
      .sort((a: any, b: any) => roleWeight(a.id) - roleWeight(b.id) || b.level - a.level || (b.gearScore ?? getGearScore(b.equipment ?? {})) - (a.gearScore ?? getGearScore(a.equipment ?? {})));
    set({
      modal: {
        id: `modal_guild_roster_${guild.id}`,
        type: 'guild',
        title: `${guild.name}: ростер`,
        text: `${members.length} игроков`,
        lines: members.map((member: any) => {
          const role = guild.leaderId === member.id ? '👑 ГМ' : guild.deputyId === member.id ? '🛡️ Зам' : (guild.officerIds ?? []).includes(member.id) ? '⚔️ Офицер' : 'Участник';
          const gear = member.id === server.player.id ? getGearScore(server.player.equipment) : member.gearScore;
          return `${role}: ${member.name}${member.id === server.player.id ? ' · ты' : ''} · Lv. ${member.level} · Gear ${gear}`;
        }),
      },
    });
  },

  openGuildProfile: (guildId) => {
    const { server } = get();
    const guild = server.guilds.find((entry) => entry.id === guildId);
    if (!guild) return;
    const members = guild.memberIds.map((id) => server.npcs.find((npc) => npc.id === id)).filter(Boolean);
    const leader = server.npcs.find((npc) => npc.id === guild.leaderId);
    const deputy = server.npcs.find((npc) => npc.id === guild.deputyId);
    set({
      modal: {
        id: `modal_guild_${guild.id}`,
        type: 'guild',
        title: guild.name,
        text: `${guild.type} · ${guild.tier ?? 'low'} · ${members.length} игроков`,
        lines: [
          `Уровень: ${guild.level}`,
          `Вход: ${guild.minLevel ?? 1}+`,
          `ГМ: ${leader?.name ?? 'нет'}`,
          `Зам: ${deputy?.name ?? 'нет'}`,
          `Офицеры: ${(guild.officerIds ?? []).map((id) => server.npcs.find((npc) => npc.id === id)?.name ?? id).join(', ') || 'нет'}`,
          `PvP: ${guild.pvpRating}`,
          `Gear: ${guild.reputation}`,
          `Рейд: ${guild.raidProgress}%`,
          `Стабильность: ${guild.stability}%`,
          `ACTION_GUILD_ROSTER:${guild.id}`,
        ],
      },
    });
  },}));
