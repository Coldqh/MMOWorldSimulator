import type { QuestGiverDefinition } from '../types/game';

export const QUEST_GIVERS: QuestGiverDefinition[] = [
  {
    id: 'qg_mara_vane',
    name: 'Мара Вейн',
    type: 'quest_giver',
    zoneId: 'starting_city',
    shortText: 'Поручения для новичков',
    questIds: [
      'quest_first_steps',
      'quest_green_slime_cleanup',
      'quest_field_rat_cleanup',
      'quest_first_field_trophy',
      'quest_go_to_old_holt',
    ],
  },
  {
    id: 'qg_old_holt',
    name: 'Старик Холт',
    type: 'quest_giver',
    zoneId: 'greenfield',
    shortText: 'Смотрит за старой дорогой',
    questIds: [
      'quest_gray_wolf_fence',
      'quest_wolf_pelts',
      'quest_old_road_check',
    ],
  },
  {
    id: 'qg_lyra_munn',
    name: 'Лира Мунн',
    type: 'quest_giver',
    zoneId: 'moonwood',
    shortText: 'Следит за лунной чащей',
    questIds: [
      'quest_moon_wisps',
      'quest_moon_dust',
      'quest_redcap_warning',
    ],
  },
  {
    id: 'qg_brigg_colter',
    name: 'Бригг Колтер',
    type: 'quest_giver',
    zoneId: 'redcap_hills',
    shortText: 'Старшина каравана',
    questIds: [
      'quest_redcap_cleanup',
      'quest_redcap_key_fragments',
      'quest_to_old_lantern',
    ],
  },
  {
    id: 'qg_nathan_rowl',
    name: 'Натан Роул',
    type: 'quest_giver',
    zoneId: 'redcap_hills',
    locationText: 'У входа в Погреб Старого Фонаря',
    shortText: 'Стоит у входа в Погреб',
    questIds: [
      'quest_open_party_finder',
      'quest_enter_old_lantern',
      'quest_old_lantern_keeper',
    ],
  },
];

export const getQuestGiverById = (id: string) => QUEST_GIVERS.find((giver) => giver.id === id);

export const getQuestGiversByZoneId = (zoneId: string) =>
  QUEST_GIVERS.filter((giver) => giver.zoneId === zoneId);
