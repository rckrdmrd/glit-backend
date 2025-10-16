/**
 * Missions Templates
 *
 * Template definitions for auto-generating daily, weekly, and special missions.
 */

import { MissionTemplate } from './missions.types';

/**
 * Daily Mission Templates
 *
 * 3 random missions are assigned daily to each user.
 */
export const DAILY_MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'daily_exercises_5',
    title: 'Completar 5 ejercicios',
    description: 'Completa 5 ejercicios de cualquier módulo hoy',
    type: 'daily',
    objectives: [
      {
        type: 'exercises_completed',
        target: 5,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 50,
      xp: 100,
    },
    difficulty: 'easy',
    icon: 'target',
  },
  {
    id: 'daily_coins_100',
    title: 'Ganar 100 ML Coins',
    description: 'Gana 100 ML Coins realizando cualquier actividad',
    type: 'daily',
    objectives: [
      {
        type: 'ml_coins_earned',
        target: 100,
        description: 'ML Coins ganados',
      },
    ],
    rewards: {
      ml_coins: 75,
      xp: 150,
    },
    difficulty: 'easy',
    icon: 'coins',
  },
  {
    id: 'daily_module_complete',
    title: 'Completar 1 módulo',
    description: 'Completa un módulo completo de cualquier categoría',
    type: 'daily',
    objectives: [
      {
        type: 'modules_completed',
        target: 1,
        description: 'Módulos completados',
      },
    ],
    rewards: {
      ml_coins: 150,
      xp: 300,
    },
    difficulty: 'medium',
    icon: 'book',
  },
  {
    id: 'daily_powerups_3',
    title: 'Usar 3 power-ups',
    description: 'Utiliza 3 power-ups en ejercicios hoy',
    type: 'daily',
    objectives: [
      {
        type: 'powerups_used',
        target: 3,
        description: 'Power-ups utilizados',
      },
    ],
    rewards: {
      ml_coins: 60,
      xp: 120,
      items: ['power_up_hint'],
    },
    difficulty: 'easy',
    icon: 'zap',
  },
  {
    id: 'daily_perfect_score',
    title: 'Lograr 1 puntaje perfecto',
    description: 'Obtén un 100% en cualquier ejercicio sin usar pistas',
    type: 'daily',
    objectives: [
      {
        type: 'perfect_scores',
        target: 1,
        description: 'Puntajes perfectos',
      },
    ],
    rewards: {
      ml_coins: 100,
      xp: 200,
    },
    difficulty: 'medium',
    icon: 'star',
  },
  {
    id: 'daily_no_hints',
    title: 'Sin pistas',
    description: 'Completa 3 ejercicios sin usar pistas',
    type: 'daily',
    objectives: [
      {
        type: 'exercises_no_hints',
        target: 3,
        description: 'Ejercicios sin pistas',
      },
    ],
    rewards: {
      ml_coins: 80,
      xp: 160,
    },
    difficulty: 'medium',
    icon: 'brain',
  },
  {
    id: 'daily_streak',
    title: 'Mantener racha',
    description: 'Inicia sesión y completa al menos 1 ejercicio para mantener tu racha',
    type: 'daily',
    objectives: [
      {
        type: 'exercises_completed',
        target: 1,
        description: 'Ejercicio completado',
      },
    ],
    rewards: {
      ml_coins: 30,
      xp: 50,
    },
    difficulty: 'easy',
    icon: 'fire',
  },
  {
    id: 'daily_xp_200',
    title: 'Ganar 200 XP',
    description: 'Acumula 200 puntos de experiencia hoy',
    type: 'daily',
    objectives: [
      {
        type: 'total_xp_earned',
        target: 200,
        description: 'XP ganado',
      },
    ],
    rewards: {
      ml_coins: 70,
      xp: 140,
    },
    difficulty: 'easy',
    icon: 'trending-up',
  },
  {
    id: 'daily_exercises_10',
    title: 'Maratón de ejercicios',
    description: 'Completa 10 ejercicios en un solo día',
    type: 'daily',
    objectives: [
      {
        type: 'exercises_completed',
        target: 10,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 120,
      xp: 250,
    },
    difficulty: 'hard',
    icon: 'award',
  },
  {
    id: 'daily_friends_help',
    title: 'Ayudar a 2 compañeros',
    description: 'Colabora con 2 compañeros en ejercicios o actividades',
    type: 'daily',
    objectives: [
      {
        type: 'friends_helped',
        target: 2,
        description: 'Compañeros ayudados',
      },
    ],
    rewards: {
      ml_coins: 90,
      xp: 180,
    },
    difficulty: 'medium',
    icon: 'users',
  },
];

/**
 * Weekly Mission Templates
 *
 * 5 missions are assigned weekly to each user (renew every Monday 00:00 UTC).
 */
export const WEEKLY_MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'weekly_exercises_20',
    title: 'Completar 20 ejercicios',
    description: 'Completa 20 ejercicios durante esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'weekly_exercises',
        target: 20,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 300,
      xp: 600,
    },
    difficulty: 'easy',
    icon: 'target',
  },
  {
    id: 'weekly_coins_500',
    title: 'Ganar 500 ML Coins',
    description: 'Acumula 500 ML Coins durante esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'ml_coins_earned',
        target: 500,
        description: 'ML Coins ganados',
      },
    ],
    rewards: {
      ml_coins: 400,
      xp: 800,
    },
    difficulty: 'medium',
    icon: 'coins',
  },
  {
    id: 'weekly_rank_up',
    title: 'Subir de rango',
    description: 'Alcanza el siguiente rango Maya esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'rank_up',
        target: 1,
        description: 'Promoción de rango',
      },
    ],
    rewards: {
      ml_coins: 500,
      xp: 1000,
    },
    difficulty: 'epic',
    icon: 'trending-up',
  },
  {
    id: 'weekly_achievements_3',
    title: 'Desbloquear 3 logros',
    description: 'Desbloquea 3 achievements durante esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'achievements_unlocked',
        target: 3,
        description: 'Logros desbloqueados',
      },
    ],
    rewards: {
      ml_coins: 350,
      xp: 700,
    },
    difficulty: 'hard',
    icon: 'trophy',
  },
  {
    id: 'weekly_modules_3',
    title: 'Completar 3 módulos',
    description: 'Completa 3 módulos completos esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'modules_completed',
        target: 3,
        description: 'Módulos completados',
      },
    ],
    rewards: {
      ml_coins: 450,
      xp: 900,
    },
    difficulty: 'hard',
    icon: 'book-open',
  },
  {
    id: 'weekly_streak_7',
    title: 'Racha de 7 días',
    description: 'Mantén una racha de 7 días consecutivos',
    type: 'weekly',
    objectives: [
      {
        type: 'streak_maintained',
        target: 7,
        description: 'Días de racha',
      },
    ],
    rewards: {
      ml_coins: 600,
      xp: 1200,
    },
    difficulty: 'epic',
    icon: 'fire',
  },
  {
    id: 'weekly_perfect_5',
    title: '5 puntajes perfectos',
    description: 'Obtén 5 puntajes perfectos (100%) esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'perfect_scores',
        target: 5,
        description: 'Puntajes perfectos',
      },
    ],
    rewards: {
      ml_coins: 400,
      xp: 800,
    },
    difficulty: 'hard',
    icon: 'star',
  },
  {
    id: 'weekly_exercises_50',
    title: 'Gran maratón semanal',
    description: 'Completa 50 ejercicios esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'weekly_exercises',
        target: 50,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 700,
      xp: 1400,
    },
    difficulty: 'epic',
    icon: 'award',
  },
  {
    id: 'weekly_xp_1000',
    title: 'Ganar 1000 XP',
    description: 'Acumula 1000 puntos de experiencia esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'total_xp_earned',
        target: 1000,
        description: 'XP ganado',
      },
    ],
    rewards: {
      ml_coins: 500,
      xp: 1000,
    },
    difficulty: 'hard',
    icon: 'zap',
  },
  {
    id: 'weekly_login_5',
    title: 'Iniciar sesión 5 días',
    description: 'Inicia sesión al menos 5 días diferentes esta semana',
    type: 'weekly',
    objectives: [
      {
        type: 'login_days',
        target: 5,
        description: 'Días con sesión',
      },
    ],
    rewards: {
      ml_coins: 250,
      xp: 500,
    },
    difficulty: 'medium',
    icon: 'calendar',
  },
];

/**
 * Special Mission Templates
 *
 * Event-based missions with specific start/end dates.
 */
export const SPECIAL_MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: 'special_weekend_challenge',
    title: 'Desafío de fin de semana',
    description: 'Completa 15 ejercicios entre viernes y domingo',
    type: 'special',
    objectives: [
      {
        type: 'exercises_completed',
        target: 15,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 500,
      xp: 1000,
      items: ['power_up_vision_lectora', 'power_up_hint'],
    },
    difficulty: 'hard',
    icon: 'gift',
  },
  {
    id: 'special_science_day',
    title: 'Día de la Ciencia',
    description: 'Evento especial: completa 10 ejercicios de ciencias',
    type: 'special',
    objectives: [
      {
        type: 'exercises_completed',
        target: 10,
        description: 'Ejercicios de ciencias',
      },
    ],
    rewards: {
      ml_coins: 400,
      xp: 800,
    },
    difficulty: 'medium',
    icon: 'flask',
  },
  {
    id: 'special_guild_competition',
    title: 'Competencia entre guilds',
    description: 'Únete a una guild y completa 25 ejercicios',
    type: 'special',
    objectives: [
      {
        type: 'guild_joined',
        target: 1,
        description: 'Guild unido',
      },
      {
        type: 'exercises_completed',
        target: 25,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 800,
      xp: 1600,
    },
    difficulty: 'epic',
    icon: 'users',
  },
  {
    id: 'special_new_year',
    title: 'Misión de Año Nuevo',
    description: 'Comienza el año nuevo con fuerza: completa 30 ejercicios',
    type: 'special',
    objectives: [
      {
        type: 'exercises_completed',
        target: 30,
        description: 'Ejercicios completados',
      },
    ],
    rewards: {
      ml_coins: 1000,
      xp: 2000,
      items: ['power_up_hint', 'power_up_segunda_oportunidad'],
    },
    difficulty: 'epic',
    icon: 'sparkles',
  },
  {
    id: 'special_maya_festival',
    title: 'Festival Maya',
    description: 'Celebra la cultura Maya completando 20 ejercicios',
    type: 'special',
    objectives: [
      {
        type: 'exercises_completed',
        target: 20,
        description: 'Ejercicios completados',
      },
      {
        type: 'ml_coins_earned',
        target: 300,
        description: 'ML Coins ganados',
      },
    ],
    rewards: {
      ml_coins: 700,
      xp: 1400,
    },
    difficulty: 'hard',
    icon: 'sun',
  },
];

/**
 * Get random daily mission templates
 *
 * @param count - Number of templates to get
 * @returns Array of random daily mission templates
 */
export function getRandomDailyTemplates(count: number = 3): MissionTemplate[] {
  const shuffled = [...DAILY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get random weekly mission templates
 *
 * @param count - Number of templates to get
 * @returns Array of random weekly mission templates
 */
export function getRandomWeeklyTemplates(count: number = 5): MissionTemplate[] {
  const shuffled = [...WEEKLY_MISSION_TEMPLATES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get template by ID
 *
 * @param templateId - Template ID
 * @returns Mission template or undefined
 */
export function getTemplateById(templateId: string): MissionTemplate | undefined {
  const allTemplates = [
    ...DAILY_MISSION_TEMPLATES,
    ...WEEKLY_MISSION_TEMPLATES,
    ...SPECIAL_MISSION_TEMPLATES,
  ];

  return allTemplates.find((t) => t.id === templateId);
}

/**
 * Get all templates by type
 *
 * @param type - Mission type
 * @returns Array of templates
 */
export function getTemplatesByType(type: 'daily' | 'weekly' | 'special'): MissionTemplate[] {
  switch (type) {
    case 'daily':
      return DAILY_MISSION_TEMPLATES;
    case 'weekly':
      return WEEKLY_MISSION_TEMPLATES;
    case 'special':
      return SPECIAL_MISSION_TEMPLATES;
    default:
      return [];
  }
}
