import { getDungeonById, getMobById } from '../content/world';
import type { Rng } from '../engine/rng';
import { uid } from '../engine/rng';
import type { CombatState, DungeonRunState, GameModal, PartyRoleMap, ServerState } from '../types/game';
import { getPlayerStats } from './itemSystem';
import { startBossCombat } from './combatSystem';
import { buildPartyRolesFromMembers, getClassPartyRole, isDpsRole } from './partyRoleSystem';

export const buildPartyRoles = (server: ServerState, partyNpcIds: string[]): PartyRoleMap | null =>
  buildPartyRolesFromMembers(server, [server.player.id, ...partyNpcIds]);

const shuffle = <T,>(items: T[], rng: Rng) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const findDungeonParty = (server: ServerState, dungeonId: string, rng: Rng): string[] => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon || server.player.level < (dungeon.contentType === 'raid' ? dungeon.levelRange[0] : 5)) return [];

  const playerGuild = server.player.guildId
    ? server.guilds.find((guild) => guild.id === server.player.guildId)
    : undefined;
  const guildLocked = playerGuild?.tier === 'high';
  const playerRole = getClassPartyRole(server.player.classId);

  const basePool = shuffle(
    server.npcs
      .filter((npc) => npc.level >= dungeon.levelRange[0] - 1 && npc.level <= dungeon.levelRange[1] + 1)
      .filter((npc) => !guildLocked || npc.guildId === playerGuild?.id)
      .filter((npc) => ['RAIDER', 'PVE_FARMER', 'GUILD_PLAYER', 'CASUAL', 'HARDCORE'].includes(npc.roleFocus)),
    rng,
  ).sort((a, b) => {
    const aScore = a.activityLevel + a.socialWeight + a.gearScore / 16 + (a.roleFocus === 'RAIDER' ? 4 : 0) + rng.next() * 8;
    const bScore = b.activityLevel + b.socialWeight + b.gearScore / 16 + (b.roleFocus === 'RAIDER' ? 4 : 0) + rng.next() * 8;
    return bScore - aScore;
  });

  const selected: string[] = [];
  const takeFirst = (predicate: (npc: ServerState['npcs'][number]) => boolean) => {
    const npc = basePool.find((entry) => !selected.includes(entry.id) && predicate(entry));
    if (npc) selected.push(npc.id);
    return npc;
  };

  if (playerRole !== 'tank') takeFirst((npc) => getClassPartyRole(npc.classId) === 'tank');
  if (playerRole !== 'healer') takeFirst((npc) => getClassPartyRole(npc.classId) === 'healer');

  // DPS slots are strict: only damage roles may fill damage slots.
  for (const npc of basePool) {
    if (selected.length >= dungeon.partySize - 1) break;
    if (selected.includes(npc.id)) continue;
    if (!isDpsRole(getClassPartyRole(npc.classId))) continue;
    selected.push(npc.id);
  }

  if (selected.length < dungeon.partySize - 1) return [];
  const roles = buildPartyRoles(server, selected);
  if (!roles) return [];
  const allMembers = [server.player, ...selected.map((id) => server.npcs.find((npc) => npc.id === id)).filter(Boolean) as ServerState['npcs']];
  const hasOnlyValidRoles = allMembers.every((member) => {
    const role = getClassPartyRole(member.classId);
    if (role === 'tank') return member.classId === 'warrior';
    if (role === 'healer') return member.classId === 'priest';
    return member.classId === 'mage' || member.classId === 'ranger';
  });
  return hasOnlyValidRoles ? selected : [];
};

export const createDungeonRun = (server: ServerState, dungeonId: string, rng: Rng): DungeonRunState | null => {
  const dungeon = getDungeonById(dungeonId);
  if (!dungeon || server.player.level < (dungeon.contentType === 'raid' ? dungeon.levelRange[0] : 5)) return null;

  const party = findDungeonParty(server, dungeonId, rng);
  if (party.length < dungeon.partySize - 1) return null;
  const partyRoles = buildPartyRoles(server, party);
  if (!partyRoles) return null;

  return {
    id: uid('dungeon_run', rng),
    dungeonId,
    partyNpcIds: party,
    partyRoles,
    currentFloor: 0,
    currentEncounterIndex: 0,
    status: 'betweenFloors',
    startedDay: server.serverDay,
    startedMinute: server.currentMinute,
    contentType: dungeon.contentType ?? 'dungeon',
  };
};

export const startDungeonFloorCombat = (server: ServerState, rng: Rng): CombatState | null => {
  const run = server.currentDungeonRun;
  if (!run || run.status !== 'betweenFloors') return null;

  const dungeon = getDungeonById(run.dungeonId);
  const floor = dungeon?.floors[run.currentFloor];
  if (!dungeon || !floor) return null;

  const encounterIndex = run.currentEncounterIndex ?? 0;
  const mobId = floor.mobIds[encounterIndex];
  if (!mobId) return null;
  const mob = getMobById(mobId);
  const total = floor.mobIds.length;
  const title = mob ? `${mob.name} · ${encounterIndex + 1}/${total}` : `${floor.name} · ${encounterIndex + 1}/${total}`;
  const isBossTarget = floor.type === 'boss' && encounterIndex >= total - 1;
  const combat = startBossCombat(
    server,
    mobId,
    dungeon.id,
    (run.contentType ?? dungeon.contentType ?? 'dungeon') as 'dungeon' | 'raid',
    run.partyNpcIds,
    rng,
    run.partyRoles,
    [mobId],
    title,
    encounterIndex,
    total,
    isBossTarget,
  );
  if (!combat) return null;

  return {
    ...combat,
    dungeonFloorIndex: run.currentFloor,
    log: [
      `${floor.name}.`,
      `Цель ${encounterIndex + 1}/${total}: ${mob?.name ?? mobId}.`,
      `Пати: ${run.partyNpcIds.length + 1}.`,
    ],
  };
};

export const advanceDungeonAfterEncounter = (server: ServerState, floorIndex: number): ServerState => {
  const run = server.currentDungeonRun;
  const dungeon = run ? getDungeonById(run.dungeonId) : undefined;
  const floor = dungeon?.floors[floorIndex];
  if (!run || !dungeon || !floor || floorIndex !== run.currentFloor) return server;

  const nextEncounter = (run.currentEncounterIndex ?? 0) + 1;
  if (nextEncounter < floor.mobIds.length) {
    return { ...server, currentDungeonRun: { ...run, currentEncounterIndex: nextEncounter, status: 'betweenFloors' } };
  }

  const nextFloor = run.currentFloor + 1;
  if (nextFloor >= dungeon.floors.length) return { ...server, currentDungeonRun: undefined };
  return { ...server, currentDungeonRun: { ...run, currentFloor: nextFloor, currentEncounterIndex: 0, status: 'betweenFloors' } };
};

export const completeDungeonFloor = advanceDungeonAfterEncounter;

export const restInDungeon = (server: ServerState): { server: ServerState; minutes: number } => {
  const stats = getPlayerStats(server.player);
  return { minutes: 0, server: { ...server, player: { ...server.player, hp: stats.hp, mana: stats.mana } } };
};

export const resolveDungeonEventFloor = (server: ServerState, _rng: Rng): { server: ServerState; modal: GameModal | null; minutes: number } => {
  return { server, modal: null, minutes: 0 };
};
