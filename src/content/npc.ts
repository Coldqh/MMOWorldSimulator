import type { Guild, GuildType, RoleFocus } from '../types/game';

export const NPC_NAMES = [
  'Riven', 'Mira', 'Torn', 'Kael', 'Grin', 'Velvet', 'OldTom', 'Nora', 'Ashen', 'Dey',
  'Silk', 'Raskol', 'Lime', 'Borin', 'Elliot', 'Moss', 'Kira', 'Hawk', 'Beryl', 'Rowan',
  'TeaFox', 'Nim', 'Garren', 'Leif', 'Mako', 'Veyron', 'Pike', 'Helm', 'Sora', 'RedBee'
];

export const ROLE_FOCUSES: RoleFocus[] = ['pve', 'pvp', 'mixed'];

export const GUILD_TEMPLATES: Array<{ name: string; type: GuildType; focus: string; recruitmentPolicy: Guild['recruitmentPolicy']; tier?: 'low' | 'mid' | 'high'; minLevel?: number }> = [
  { name: 'Silver Hares', type: 'PVE', focus: 'низкие уровни, чат, данжи', recruitmentPolicy: 'open', tier: 'low', minLevel: 1 },
  { name: 'First Camp', type: 'PVE', focus: 'новички, группы, заявки', recruitmentPolicy: 'open', tier: 'low', minLevel: 1 },
  { name: 'Warm Ash', type: 'PVE', focus: 'вечерний фарм', recruitmentPolicy: 'open', tier: 'low', minLevel: 1 },
  { name: 'Blue Cartel', type: 'MIXED', focus: 'рынок, скупка, перепродажа', recruitmentPolicy: 'invite', tier: 'low', minLevel: 1 },
  { name: 'Old Lantern', type: 'PVE', focus: 'данжи, боссы, редкий лут', recruitmentPolicy: 'invite', tier: 'mid', minLevel: 10 },
  { name: 'Iron Tea', type: 'MIXED', focus: 'фарм, PvP, рейды', recruitmentPolicy: 'invite', tier: 'mid', minLevel: 10 },
  { name: 'North Chapel', type: 'PVE', focus: 'мид-гейм данжи', recruitmentPolicy: 'invite', tier: 'mid', minLevel: 10 },
  { name: 'Mushroom Guard', type: 'PVE', focus: 'споты и помощь', recruitmentPolicy: 'open', tier: 'mid', minLevel: 10 },
  { name: 'Moon Hares', type: 'PVE', focus: 'закрытие данжей', recruitmentPolicy: 'strict', tier: 'mid', minLevel: 10 },
  { name: 'Red Orchard', type: 'PVP', focus: 'арена, дуэли, рейтинг', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Nevermore', type: 'PVE', focus: 'рейдовый прогресс', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Jotunheim', type: 'PVP', focus: 'топ арены', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Triumvirate', type: 'PVE', focus: 'рейды и топ Gear Score', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Kamigawa', type: 'PVE', focus: 'Вирмшпиль', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Masquerade', type: 'PVP', focus: 'дуэли, арена, рекрутинг', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Glass Shelter', type: 'MIXED', focus: 'рейды, рынок, арена', recruitmentPolicy: 'invite', tier: 'high', minLevel: 20 },
  { name: 'Alpha Leone', type: 'PVE', focus: 'лучший шмот сервера', recruitmentPolicy: 'strict', tier: 'high', minLevel: 20 },
  { name: 'Dawn Vendor', type: 'MIXED', focus: 'рынок хай-лвл шмота', recruitmentPolicy: 'invite', tier: 'mid', minLevel: 10 },
  { name: 'Rusty Mug', type: 'PVE', focus: 'без гонки, вечерние пати', recruitmentPolicy: 'open', tier: 'low', minLevel: 1 },
  { name: 'Blackroot Line', type: 'PVE', focus: 'данжи 10+', recruitmentPolicy: 'invite', tier: 'mid', minLevel: 10 }
];
