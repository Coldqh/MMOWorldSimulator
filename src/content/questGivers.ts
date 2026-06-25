import type { QuestGiverDefinition } from '../types/game';

export const QUEST_GIVERS: QuestGiverDefinition[] = [
  {
    id: 'qg_mara_vane',
    name: 'Мара Вейн',
    type: 'quest_giver',
    zoneId: 'starting_city',
    shortText: 'Стартовые поручения',
    questIds: ['quest_first_steps'],
  },
  {
    id: 'qg_old_holt',
    name: 'Старик Холт',
    type: 'quest_giver',
    zoneId: 'greenfield',
    shortText: 'Зелёные Поля',
    questIds: ['quest_green_slime_cleanup', 'quest_field_rat_cleanup', 'quest_first_field_trophy'],
  },
  {
    id: 'qg_brigg_colter',
    name: 'Бригг Колтер',
    type: 'quest_giver',
    zoneId: 'redcap_hills',
    shortText: 'Холмы Красных Колпаков',
    questIds: ['quest_redcap_cleanup', 'quest_redcap_key_fragments', 'quest_open_party_finder', 'quest_enter_old_lantern'],
  },
  {
    id: 'qg_sera_ash',
    name: 'Сера Эш',
    type: 'quest_giver',
    zoneId: 'ashen_mire',
    shortText: 'Пепельная Топь',
    questIds: ['quest_ash_mire_cleanup', 'quest_ash_guard_watch', 'quest_black_king_watch'],
  },
  {
    id: 'qg_lyra_munn',
    name: 'Лира Мунн',
    type: 'quest_giver',
    zoneId: 'moonwood',
    shortText: 'Лунный Лес',
    questIds: ['quest_moon_wisps', 'quest_moon_dust', 'quest_mire_depths'],
  },
  {
    id: 'qg_sigrid_hale',
    name: 'Сигрид Хейл',
    type: 'quest_giver',
    zoneId: 'frostspire_ridge',
    shortText: 'Ледяной Хребет',
    questIds: ['quest_frost_ridge_hunt', 'quest_frost_contract_camp', 'quest_frost_vault'],
  },
  {
    id: 'qg_arlan_voss',
    name: 'Арлан Восс',
    type: 'quest_giver',
    zoneId: 'wyrmspire_peak',
    shortText: 'Вершина Вирмшпиля',
    questIds: ['quest_wyrmspire_approach', 'quest_glass_catacomb', 'quest_old_lantern_keeper'],
  },
];

export const getQuestGiverById = (id: string) => QUEST_GIVERS.find((giver) => giver.id === id);

export const getQuestGiversByZoneId = (zoneId: string) =>
  QUEST_GIVERS.filter((giver) => giver.zoneId === zoneId);
