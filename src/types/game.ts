export type Id = string;

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic"
  | "unique";
export type ItemType =
  | "weapon"
  | "armor"
  | "accessory"
  | "card"
  | "consumable"
  | "material"
  | "mount"
  | "pet"
  | "cosmetic"
  | "quest";
export type EquipmentSlot =
  | "weapon"
  | "head"
  | "chest"
  | "legs"
  | "boots"
  | "ring"
  | "amulet";
export type RoleFocus = "pve" | "pvp" | "mixed";
export type GuildType = "PVE" | "PVP" | "MIXED";
export type GuildFocus = "pvp" | "pve" | "hybrid";
export type GuildTier = "low" | "mid" | "high" | "max";
export type NpcPlaystyle = "pve" | "pvp" | "mixed";
export type NpcLocationMode = "city" | "zone" | "spot";
export type GuildWarVoteKind = "declare" | "accept" | "extend";
export type GuildWarVoteStatus = "active" | "passed" | "failed" | "expired" | "cancelled";
export type GuildWarStatus = "pending_votes" | "scheduled" | "active" | "finished" | "cancelled";
export type NewsType =
  | "drop"
  | "guild"
  | "raid"
  | "pvp"
  | "market"
  | "system"
  | "enhance"
  | "dungeon";
export type CombatSource = "spot" | "dungeon" | "raid" | "arena" | "boss" | "guild_war" | "rare_spawn";
export type ModalType =
  | "reward"
  | "death"
  | "system"
  | "settings"
  | "guild"
  | "dungeon"
  | "loot"
  | "enhance"
  | "item"
  | "npc";

export interface StatBlock {
  hp: number;
  mana: number;
  attack: number;
  magic: number;
  defense: number;
  speed: number;
}

export interface EffectDefinition {
  type: "DAMAGE" | "HEAL" | "SHIELD" | "BUFF_ATTACK" | "BUFF_DEFENSE";
  scale?: "attack" | "magic" | "defense";
  value: number;
  duration?: number;
}

export interface SkillDefinition {
  id: Id;
  name: string;
  classIds: Id[];
  manaCost: number;
  cooldown: number;
  description: string;
  effects: EffectDefinition[];
}

export interface ClassDefinition {
  id: Id;
  name: string;
  role: string;
  description: string;
  baseStats: StatBlock;
  skillIds: Id[];
}

export interface RaceDefinition {
  id: Id;
  name: string;
  description: string;
  statBonus: Partial<StatBlock>;
  tags: string[];
}

export type ItemBindType = "none" | "bindOnPickup";

export interface ItemDefinition {
  id: Id;
  name: string;
  type: ItemType;
  rarity: Rarity;
  levelReq: number;
  classTags: Id[];
  slot?: EquipmentSlot;
  stats: Partial<StatBlock>;
  effects: EffectDefinition[];
  socketSlots: number;
  tradeable: boolean;
  bindType?: ItemBindType;
  price: number;
  announceIfDropped: boolean;
  setId?: Id;
  sourceType?: "general" | "dungeon" | "raid" | "world";
  sourceId?: Id;
  sourceName?: string;
}

export interface ItemInstance {
  instanceId: Id;
  itemId: Id;
  enhancement: number;
  cardIds?: Id[];
  socketSlots?: number;
  boundTo?: Id;
}

export interface InventoryStack {
  itemId: Id;
  amount: number;
  enhancement?: number;
  cardIds?: Id[];
  socketSlots?: number;
}

export interface RewardSummary {
  xp: number;
  gold: number;
  items: InventoryStack[];
  lines: string[];
}

export interface GameModal {
  id: Id;
  type: ModalType;
  title: string;
  text: string;
  reward?: RewardSummary;
  lines?: string[];
  rarity?: Rarity;
  itemId?: Id;
}

export interface Equipment {
  weapon?: ItemInstance;
  head?: ItemInstance;
  chest?: ItemInstance;
  legs?: ItemInstance;
  boots?: ItemInstance;
  ring?: ItemInstance;
  amulet?: ItemInstance;
}

export interface Player {
  id: Id;
  name: string;
  raceId: Id;
  classId: Id;
  level: number;
  xp: number;
  gold: number;
  hp: number;
  mana: number;
  inventory: InventoryStack[];
  equipment: Equipment;
  guildId?: Id;
  reputation: number;
  arenaRating: number;
  lastWarAttackDay?: number;
  lastWarAttackMinute?: number;
  dungeonMarks?: number;
  lastDailyDungeonBonusDay?: number;
  lastWeeklyDungeonChestWeek?: number;
}

export interface NpcPlayer {
  id: Id;
  name: string;
  raceId: Id;
  classId: Id;
  level: number;
  xp: number;
  gearScore: number;
  gold: number;
  guildId?: Id;
  roleFocus: RoleFocus;
  currentGoal: string;
  reputation: number;
  activityLevel: number;
  ambition: number;
  risk: number;
  socialWeight: number;
  inventory: InventoryStack[];
  equipment: Equipment;
  arenaRating: number;
  nextLevelAtDay?: number;
  nextLevelAtMinute?: number;
  skill?: number;
  playstyle?: NpcPlaystyle;
  currentZoneId?: Id;
  currentSpotId?: Id;
  locationMode?: NpcLocationMode;
  lastMovedDay?: number;
  lastMovedMinute?: number;
}

export interface Guild {
  id: Id;
  name: string;
  type: GuildType;
  guildFocus?: GuildFocus;
  level?: number; // legacy only, ignored by active guild logic
  reputation: number;
  memberIds: Id[];
  leaderId?: Id;
  deputyId?: Id;
  officerIds?: Id[];
  tier?: GuildTier;
  minLevel?: number;
  focus: string;
  castleControl?: Id;
  raidProgress: number;
  pvpRating: number;
  treasuryGold?: number;
  stability: number;
  recruitmentPolicy: "open" | "invite" | "strict";
  createdByPlayer?: boolean;
  founderPlayerId?: Id;
  createdDay?: number;
  createdMinute?: number;
}

export interface GuildRelation {
  fromGuildId: Id;
  toGuildId: Id;
  value: number;
  lastChangedDay: number;
  lastChangedMinute: number;
}

export interface GuildWarVote {
  id: Id;
  kind: GuildWarVoteKind;
  proposerGuildId: Id;
  targetGuildId: Id;
  guildId: Id;
  warId?: Id;
  proposedDurationDays: number;
  status: GuildWarVoteStatus;
  createdDay: number;
  createdMinute: number;
  endsDay: number;
  endsMinute: number;
  yesNpcIds: Id[];
  noNpcIds: Id[];
  playerVote?: "yes" | "no";
  resultText?: string;
}

export interface GuildWarKillRecord {
  id: Id;
  day: number;
  minute: number;
  killerId: Id;
  killerGuildId: Id;
  victimId: Id;
  victimGuildId: Id;
  locationId?: Id;
  source: "simulated" | "player_attack" | "npc_attack_player";
}

export interface GuildWarTopKiller {
  characterId: Id;
  guildId: Id;
  kills: number;
}

export interface GuildWar {
  id: Id;
  attackerGuildId: Id;
  defenderGuildId: Id;
  status: GuildWarStatus;
  declaredDay: number;
  declaredMinute: number;
  startsDay?: number;
  startsMinute?: number;
  endsDay: number;
  endsMinute: number;
  durationDays: number;
  extensionCount: number;
  attackerKills: number;
  defenderKills: number;
  killRecords: GuildWarKillRecord[];
  attackerTopKillers: GuildWarTopKiller[];
  defenderTopKillers: GuildWarTopKiller[];
  lastSimulatedDay?: number;
  lastSimulatedMinute?: number;
}

export interface GuildApplication {
  id: Id;
  guildId: Id;
  status: "pending" | "accepted" | "declined";
  createdDay: number;
  createdMinute: number;
  resolveDay: number;
  resolveMinute: number;
  applicantNpcId?: Id;
  resultText?: string;
}

export interface ServerNotification {
  id: Id;
  type: ModalType;
  title: string;
  text: string;
  lines: string[];
}

export type LootChoice = "need" | "want" | "pass";

export interface PendingLootRoll {
  id: Id;
  itemId: Id;
  source: "dungeon" | "raid";
  partyNpcIds: Id[];
  createdDay: number;
  createdMinute: number;
}

export interface PartyRoleMap {
  tankId: Id;
  healerId?: Id;
  dpsIds: Id[];
}

export type PartyRole = "tank" | "healer" | "physicalDps" | "magicDps";
export type PartyContentType = "dungeon" | "raid";
export type PartyListingStatus = "forming" | "ready" | "started" | "expired" | "cancelled";
export type PartyListingVisibility = "public" | "guild_internal" | "static";

export interface PartyRequirement {
  tanks: number;
  healers: number;
  dps: number;
  minLevel: number;
  maxLevel: number;
  minGearScore?: number;
  preferGuild?: boolean;
}

export interface PartyFinderListing {
  id: Id;
  dungeonId: Id;
  contentType: PartyContentType;
  visibility: PartyListingVisibility;
  leaderId: Id;
  leaderType: "player" | "npc";
  guildId?: Id;
  memberIds: Id[];
  applicantIds: Id[];
  rejectedIds?: Id[];
  roles: {
    tankIds: Id[];
    healerIds: Id[];
    dpsIds: Id[];
  };
  requirements: PartyRequirement;
  status: PartyListingStatus;
  createdDay: number;
  createdMinute: number;
  expiresDay: number;
  expiresMinute: number;
  note?: string;
  waitAttempts?: number;
  log?: string[];
  difficulty?: DungeonDifficulty;
}

export type ContractCategory = "daily" | "weekly";

export type ContractStatus =
  | "available"
  | "active"
  | "readyToClaim"
  | "claimed"
  | "expired"
  | "cancelled";

export type ContractObjectiveType =
  | "kill_mobs"
  | "kill_specific_mob"
  | "complete_dungeon"
  | "play_arena"
  | "win_arena";

export interface ContractObjective {
  type: ContractObjectiveType;
  targetId?: Id;
  targetIds?: Id[];
  levelMin?: number;
  levelMax?: number;
  required: number;
  current: number;
}

export interface ContractReward {
  xp: number;
  gold: number;
  items?: Array<{ itemId: Id; amount: number }>;
}

export interface ContractDefinition {
  id: Id;
  category: ContractCategory;
  title: string;
  objective: ContractObjective;
  reward: ContractReward;
  status: ContractStatus;
  generatedDay: number;
  generatedMinute: number;
  expiresDay: number;
  expiresMinute: number;
  acceptedDay?: number;
  acceptedMinute?: number;
  completedDay?: number;
  completedMinute?: number;
  claimedDay?: number;
  claimedMinute?: number;
}

export type WorldNpcType = "quest_giver";

export interface QuestGiverDefinition {
  id: Id;
  name: string;
  type: WorldNpcType;
  zoneId: Id;
  locationText?: string;
  levelRange?: [number, number];
  questIds: Id[];
  shortText?: string;
}

export type QuestType =
  | "talk"
  | "kill"
  | "collect"
  | "dungeon"
  | "system";

export type QuestStatus =
  | "available"
  | "active"
  | "readyToTurnIn"
  | "completed"
  | "locked";

export type QuestSystemAction =
  | "open_party_finder"
  | "enhance_item"
  | "visit_market"
  | "join_guild"
  | "visit_greenfield";

export interface QuestObjective {
  type: QuestType;
  targetId?: Id;
  targetIds?: Id[];
  required: number;
  current?: number;
  itemId?: Id;
  dungeonId?: Id;
  systemAction?: QuestSystemAction;
}

export interface QuestReward {
  xp: number;
  gold: number;
  items?: Array<{ itemId: Id; amount: number }>;
  reputation?: number;
  unlockQuestIds?: Id[];
  unlockContentIds?: Id[];
}

export interface QuestDefinition {
  id: Id;
  title: string;
  giverId: Id;
  levelReq: number;
  zoneId: Id;
  type: QuestType;
  prerequisiteQuestIds?: Id[];
  objectives: QuestObjective[];
  reward: QuestReward;
  introText: string;
  progressText?: string;
  completeText: string;
  lockedText?: string;
  importance?: "normal" | "unlock";
  unlockTargetType?: "dungeon" | "raid" | "zone";
  unlockTargetId?: Id;
}

export interface QuestState {
  status: QuestStatus;
  objectives: QuestObjective[];
  acceptedDay?: number;
  acceptedMinute?: number;
  completedDay?: number;
  completedMinute?: number;
}

export interface MobDefinition {
  id: Id;
  name: string;
  level: number;
  stats: StatBlock;
  xp: number;
  gold: [number, number];
  lootTableId: Id;
  tags: string[];
}

export interface SpotDefinition {
  id: Id;
  zoneId: Id;
  name: string;
  levelRange: [number, number];
  mobIds: Id[];
  timeCostMinutes: number;
  risk: number;
  tags: string[];
}

export interface ZoneDefinition {
  id: Id;
  name: string;
  levelRange: [number, number];
  description: string;
  spotIds: Id[];
}

export interface LootEntry {
  itemId: Id;
  chance: number;
  minLevel?: number;
  maxLevel?: number;
}

export interface LootTable {
  id: Id;
  entries: LootEntry[];
}

export interface DungeonFloorDefinition {
  id: Id;
  name: string;
  type: "mobs" | "event" | "miniBoss" | "boss";
  mobIds: Id[];
  timeCostMinutes: number;
}

export interface DungeonDefinition {
  id: Id;
  zoneId: Id;
  name: string;
  levelRange: [number, number];
  partySize: number;
  timeCostMinutes: number;
  contentType?: "dungeon" | "raid";
  bossMobId: Id;
  lootTableId: Id;
  description: string;
  floors: DungeonFloorDefinition[];
}

export type DungeonDifficulty = "normal" | "hard" | "mythic";
export type DungeonRunRank = "S" | "A" | "B" | "C" | "Fail";

export interface DungeonRunResult {
  id: Id;
  dungeonId: Id;
  difficulty: DungeonDifficulty;
  rank: DungeonRunRank;
  success: boolean;
  deaths: number;
  encountersCleared: number;
  totalEncounters: number;
  durationMinutes: number;
  marks: number;
  dailyBonus: boolean;
  weeklyBonus: boolean;
  gold: number;
  lootItemIds: Id[];
  lines: string[];
  completedDay: number;
  completedMinute: number;
}

export interface DungeonRunState {
  id: Id;
  dungeonId: Id;
  partyNpcIds: Id[];
  partyRoles?: PartyRoleMap;
  currentFloor: number;
  currentEncounterIndex: number;
  status: "betweenFloors" | "inCombat" | "completed";
  contentType?: "dungeon" | "raid";
  bossLootCount?: number;
  playerClassBossLootDropped?: boolean;
  startedDay: number;
  startedMinute: number;
  difficulty?: DungeonDifficulty;
  encountersCleared?: number;
  deaths?: number;
}

export interface NewsEntry {
  id: Id;
  day: number;
  minute: number;
  type: NewsType;
  text: string;
  important: boolean;
}

export interface MarketListing {
  id: Id;
  sellerId: Id;
  itemId: Id;
  price: number;
  basePrice: number;
  pricePercent: number;
  amount: number;
  enhancement?: number;
  cardIds?: Id[];
  socketSlots?: number;
  createdDay: number;
}

export interface RankingState {
  arenaTop: Id[];
  raidRaceTop: Id[];
  wealthTop: Id[];
  gearTop?: Id[];
  guildPvpTop?: Id[];
  guildReputationTop?: Id[];
}

export interface WorldLocationState {
  mode: "city" | "zone" | "spot";
  zoneId?: Id;
  spotId?: Id;
}


export interface CollectionProgress {
  obtainedItemIds: Id[];
  defeatedMobIds: Id[];
}


export interface CombatFloatingEvent {
  id: Id;
  turn: number;
  sourceId?: Id;
  targetId?: Id;
  type: "damage" | "heal" | "miss" | "crit" | "death";
  amount?: number;
  text: string;
}

export interface CastleHistoryEntry {
  day: number;
  minute: number;
  winnerGuildId?: Id;
  previousOwnerGuildId?: Id;
  participatingGuildIds: Id[];
  scoreSummary: string;
  mvpId?: Id;
}

export interface Castle {
  id: Id;
  name: string;
  tier: "mid" | "high" | "max";
  ownerGuildId?: Id;
  levelRange: [number, number];
  nextSiegeDay: number;
  nextSiegeMinute: number;
  registeredGuildIds: Id[];
  mapId: Id;
  history: CastleHistoryEntry[];
  lastSiegeRunId?: Id;
  lastResolvedSiegeDay?: number;
}

export interface SiegeRoster {
  castleId: Id;
  guildId: Id;
  memberIds: Id[];
  registeredDay: number;
  registeredMinute: number;
}

export interface SiegeCell {
  x: number;
  y: number;
  type: "floor" | "wall" | "gate" | "tower" | "spawn" | "center";
}

export interface SiegeMap {
  id: Id;
  width: 10;
  height: 10;
  cells: SiegeCell[];
}

export interface SiegeUnit {
  id: Id;
  sourceId: Id;
  guildId: Id;
  name: string;
  classId: Id;
  role: PartyRole;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  attack: number;
  magic: number;
  defense: number;
  speed: number;
  x: number;
  y: number;
  alive: boolean;
  kills: number;
  damageDealt: number;
  healingDone: number;
  lastHitById?: Id;
}

export interface SiegeRun {
  id: Id;
  castleId: Id;
  mapId: Id;
  day: number;
  minute: number;
  status: "active" | "finished";
  participatingGuildIds: Id[];
  units: SiegeUnit[];
  turn: number;
  log: string[];
  winnerGuildId?: Id;
}


export type RareSpawnKind = "rare_elite" | "world_boss";

export interface RareSpawnState {
  id: Id;
  kind: RareSpawnKind;
  mobId: Id;
  name: string;
  zoneId: Id;
  spotId?: Id;
  level: number;
  spawnedDay: number;
  spawnedMinute: number;
  expiresDay: number;
  expiresMinute: number;
  defeated?: boolean;
}

export interface ServerState {
  version: string;
  appVersion?: string;
  seed: number;
  characterCreated: boolean;
  serverDay: number;
  currentMinute: number;
  location: WorldLocationState;
  player: Player;
  npcs: NpcPlayer[];
  guilds: Guild[];
  guildRelations: GuildRelation[];
  guildWars: GuildWar[];
  guildWarVotes: GuildWarVote[];
  market: MarketListing[];
  rankings: RankingState;
  worldNews: NewsEntry[];
  activeRareSpawns?: RareSpawnState[];
  rareSpawnHistory?: Id[];
  lastWorldBossSpawnDay?: number;
  unlockedContent: Id[];
  guildApplications: GuildApplication[];
  partyFinderListings: PartyFinderListing[];
  notifications: ServerNotification[];
  serverWeek?: number;
  contentPatch?: number;
  metaTag?: string;
  serverChronicle?: NewsEntry[];
  pendingLootRoll?: PendingLootRoll;
  currentDungeonRun?: DungeonRunState;
  currentPartyListingId?: Id;
  collectionProgress?: CollectionProgress;
  questStates: Record<Id, QuestState>;
  contracts: ContractDefinition[];
  castles?: Castle[];
  siegeRosters?: SiegeRoster[];
  currentSiegeRun?: SiegeRun;
  siegeHistory?: CastleHistoryEntry[];
  lastDungeonRunResult?: DungeonRunResult;
}

export type CombatTeamId = "teamA" | "teamB";

export type CombatantController =
  | "player"
  | "npc"
  | "mob"
  | "system";

export type CombatantKind =
  | "player"
  | "npcPlayer"
  | "mob"
  | "boss";

export type CombatAggression =
  | "defensive"
  | "balanced"
  | "aggressive"
  | "reckless";

export type CombatTargetPriority =
  | "lowestHp"
  | "highestThreat"
  | "enemyHealer"
  | "enemyDps"
  | "enemyTank"
  | "random"
  | "focusedTarget"
  | "player";

export interface CombatantV2 {
  id: Id;
  sourceId: Id;
  name: string;
  kind: CombatantKind;
  controller: CombatantController;
  teamId: CombatTeamId;

  level: number;
  classId?: Id;
  role?: PartyRole;

  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;

  attack: number;
  magic: number;
  defense: number;
  speed: number;
  shield: number;

  gearScore?: number;
  skill?: number;

  aggression: CombatAggression;
  targetId?: Id;
  targetPriority: CombatTargetPriority;

  threat: Record<Id, number>;
  cooldowns: Record<Id, number>;
  defending: boolean;

  alive: boolean;
  damageDealt: number;
  damageTaken: number;
  healingDone: number;
  kills: number;
}

export interface CombatTeamV2 {
  id: CombatTeamId;
  name: string;
  faction?: "player" | "npc" | "mob" | "arena" | "guild";
  guildId?: Id;
  members: CombatantV2[];
}

export type CombatV2Source =
  | "spot"
  | "dungeon"
  | "raid"
  | "arena"
  | "guild_war"
  | "duel"
  | "system_test";

export interface CombatStateV2 {
  id: Id;
  version: 2;
  source: CombatV2Source;
  sourceId?: Id;

  teamA: CombatTeamV2;
  teamB: CombatTeamV2;

  activeCombatantId?: Id;
  turn: number;
  round: number;

  status: "active" | "finished" | "escaped" | "cancelled";
  winnerTeamId?: CombatTeamId;

  log: string[];
  recentEvents: string[];

  createdDay: number;
  createdMinute: number;

  rewardPending?: boolean;
  metadata?: {
    dungeonId?: Id;
    raidId?: Id;
    arenaMode?: "solo" | "3v3";
    guildWarId?: Id;
    allowLoot?: boolean;
    isFinalDungeonEncounter?: boolean;
  };
}

export interface Combatant {
  id: Id;
  name: string;
  level: number;
  classId?: Id;
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  attack: number;
  magic: number;
  defense: number;
  speed: number;
  shield: number;
  cooldowns: Record<Id, number>;
  defending: boolean;
}

export interface PartyCombatMember {
  id: Id;
  name: string;
  classId: Id;
  role: "tank" | "healer" | "physicalDps" | "magicDps";
  maxHp: number;
  hp: number;
  maxMana: number;
  mana: number;
  damageLastRound: number;
  damageTakenLastRound: number;
  healingLastRound: number;
}

export interface CombatState {
  id: Id;
  source: CombatSource;
  sourceId: Id;
  enemyMobId?: Id;
  enemyNpcId?: Id;
  player: Combatant;
  enemy: Combatant;
  partyNpcIds: Id[];
  partyRoles?: PartyRoleMap;
  partyMembers?: PartyCombatMember[];
  enemyMobIds?: Id[];
  enemyNpcIds?: Id[];
  allyNpcIds?: Id[];
  arenaMode?: "1v1" | "3v3" | "5v5" | "10v10" | "team";
  teamA?: CombatTeamV2;
  teamB?: CombatTeamV2;
  activeCombatantId?: Id;
  winnerTeamId?: CombatTeamId;
  recentEvents?: string[];
  floatingEvents?: CombatFloatingEvent[];
  round?: number;
  dungeonEncounterIndex?: number;
  dungeonFloorEnemyCount?: number;
  isFinalDungeonEncounter?: boolean;
  allowLoot?: boolean;
  turn: number;
  log: string[];
  status: "active" | "victory" | "defeat";
  reward?: RewardSummary;
  defeatLines?: string[];
  dungeonFloorIndex?: number;
}

export type ScreenId =
  | "start"
  | "character"
  | "world"
  | "goals"
  | "dungeon"
  | "guild"
  | "server"
  | "market"
  | "arena"
  | "enhance"
  | "raid"
  | "partyFinder"
  | "quests"
  | "contracts"
  | "settings"
  | "library"
  | "news";
