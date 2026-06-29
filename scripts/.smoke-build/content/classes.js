export const CLASSES = [
    {
        id: 'warrior',
        name: 'Мечник',
        role: 'Танк / ближний бой',
        description: 'HP, защита, оружейный урон.',
        baseStats: { hp: 120, mana: 35, attack: 14, magic: 2, defense: 8, speed: 6 },
        skillIds: ['warrior_slash', 'warrior_guard_break']
    },
    {
        id: 'ranger',
        name: 'Стрелок',
        role: 'DPS / фарм / арена',
        description: 'Скорость, атака, точечный урон.',
        baseStats: { hp: 95, mana: 45, attack: 16, magic: 2, defense: 5, speed: 9 },
        skillIds: ['ranger_steady_shot', 'ranger_marked_shot']
    },
    {
        id: 'mage',
        name: 'Маг',
        role: 'DPS / магия',
        description: 'Мана, магический урон, слабая защита.',
        baseStats: { hp: 78, mana: 95, attack: 4, magic: 18, defense: 3, speed: 6 },
        skillIds: ['mage_firebolt', 'mage_arcane_wave']
    },
    {
        id: 'priest',
        name: 'Жрец',
        role: 'Support / лечение',
        description: 'Мана, лечение, защита.',
        baseStats: { hp: 90, mana: 85, attack: 5, magic: 13, defense: 6, speed: 5 },
        skillIds: ['priest_smite', 'priest_renew', 'priest_group_heal']
    }
];
export const SKILLS = [
    {
        id: 'warrior_slash',
        name: 'Рубящий удар',
        classIds: ['warrior'],
        manaCost: 6,
        cooldown: 1,
        description: 'Урон от атаки ×1.45.',
        effects: [{ type: 'DAMAGE', scale: 'attack', value: 1.45 }]
    },
    {
        id: 'warrior_guard_break',
        name: 'Слом защиты',
        classIds: ['warrior'],
        manaCost: 10,
        cooldown: 3,
        description: 'Урон от атаки ×1.7.',
        effects: [{ type: 'DAMAGE', scale: 'attack', value: 1.7 }]
    },
    {
        id: 'ranger_steady_shot',
        name: 'Точный выстрел',
        classIds: ['ranger'],
        manaCost: 7,
        cooldown: 1,
        description: 'Урон от атаки ×1.55.',
        effects: [{ type: 'DAMAGE', scale: 'attack', value: 1.55 }]
    },
    {
        id: 'ranger_marked_shot',
        name: 'Выстрел по метке',
        classIds: ['ranger'],
        manaCost: 13,
        cooldown: 3,
        description: 'Урон от атаки ×2.05.',
        effects: [{ type: 'DAMAGE', scale: 'attack', value: 2.05 }]
    },
    {
        id: 'mage_firebolt',
        name: 'Огненная стрела',
        classIds: ['mage'],
        manaCost: 9,
        cooldown: 1,
        description: 'Урон от магии ×1.65.',
        effects: [{ type: 'DAMAGE', scale: 'magic', value: 1.65 }]
    },
    {
        id: 'mage_arcane_wave',
        name: 'Арканная волна',
        classIds: ['mage'],
        manaCost: 18,
        cooldown: 3,
        description: 'Урон от магии ×2.25.',
        effects: [{ type: 'DAMAGE', scale: 'magic', value: 2.25 }]
    },
    {
        id: 'priest_smite',
        name: 'Кара',
        classIds: ['priest'],
        manaCost: 7,
        cooldown: 1,
        description: 'Урон от магии ×1.35.',
        effects: [{ type: 'DAMAGE', scale: 'magic', value: 1.35 }]
    },
    {
        id: 'priest_renew',
        name: 'Обновление',
        classIds: ['priest'],
        manaCost: 15,
        cooldown: 3,
        description: 'Лечение от магии ×1.8.',
        effects: [{ type: 'HEAL', scale: 'magic', value: 1.8 }]
    },
    {
        id: 'priest_group_heal',
        name: 'Круг лечения',
        classIds: ['priest'],
        manaCost: 26,
        cooldown: 4,
        description: 'АоЕ лечение пати от магии ×1.1.',
        effects: [{ type: 'HEAL', scale: 'magic', value: 1.1 }]
    }
];
export const getClassById = (id) => CLASSES.find((entry) => entry.id === id);
export const getSkillById = (id) => SKILLS.find((entry) => entry.id === id);
