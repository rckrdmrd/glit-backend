-- ============================================================================
-- Achievements Seed Data - GLIT Platform
-- 25+ Achievements across 5 categories
-- Based on: /docs/projects/glit/04-gamification/achievements-system.md
-- ============================================================================

-- Delete existing achievements (for re-seeding)
-- DELETE FROM gamification_system.achievements;

-- ============================================================================
-- CATEGORY 1: Primera Lectura (Progress) - 5 achievements
-- ============================================================================

INSERT INTO gamification_system.achievements (
  name, description, category, icon, rarity,
  conditions, rewards, order_index, is_active
) VALUES

-- 1. Primer Paso
('Primer Paso', 'Complete tu primer ejercicio', 'progress', '🎯', 'common',
  '{"type": "exercise_completed", "requirements": {"exercises_count": 1}}'::jsonb,
  '{"ml_coins": 50, "xp": 10}'::jsonb, 1, true),

-- 2. Detective Novato
('Detective Novato', 'Completa tu primer módulo completo', 'progress', '🔍', 'common',
  '{"type": "module_completed", "requirements": {"modules_count": 1}}'::jsonb,
  '{"ml_coins": 100, "xp": 50}'::jsonb, 2, true),

-- 3. Lector Persistente
('Lector Persistente', 'Mantén una racha de 7 días consecutivos', 'streak', '🔥', 'rare',
  '{"type": "streak", "requirements": {"days": 7}}'::jsonb,
  '{"ml_coins": 150, "xp": 75}'::jsonb, 3, true),

-- 4. Explorador Curioso
('Explorador Curioso', 'Completa 10 ejercicios diferentes', 'exploration', '🗺️', 'common',
  '{"type": "exercise_variety", "requirements": {"unique_exercises": 10}}'::jsonb,
  '{"ml_coins": 75, "xp": 30}'::jsonb, 4, true),

-- 5. Estudiante Dedicado
('Estudiante Dedicado', 'Alcanza 500 XP totales', 'progress', '⭐', 'common',
  '{"type": "xp_milestone", "requirements": {"total_xp": 500}}'::jsonb,
  '{"ml_coins": 100, "xp": 0}'::jsonb, 5, true),

-- ============================================================================
-- CATEGORY 2: Progreso Académico (Completion) - 6 achievements
-- ============================================================================

-- 6. Graduado Literal
('Graduado Literal', 'Completa todos los ejercicios del Módulo 1', 'completion', '📖', 'rare',
  '{"type": "module_mastery", "requirements": {"module_id": 1, "completion": 100}}'::jsonb,
  '{"ml_coins": 200, "xp": 100}'::jsonb, 6, true),

-- 7. Maestro Inferencial
('Maestro Inferencial', 'Completa todos los ejercicios del Módulo 2', 'completion', '🧠', 'rare',
  '{"type": "module_mastery", "requirements": {"module_id": 2, "completion": 100}}'::jsonb,
  '{"ml_coins": 250, "xp": 125}'::jsonb, 7, true),

-- 8. Crítico Experto
('Crítico Experto', 'Completa todos los ejercicios del Módulo 3', 'completion', '🎓', 'epic',
  '{"type": "module_mastery", "requirements": {"module_id": 3, "completion": 100}}'::jsonb,
  '{"ml_coins": 300, "xp": 150}'::jsonb, 8, true),

-- 9. Lector Digital
('Lector Digital', 'Completa todos los ejercicios del Módulo 4', 'completion', '💻', 'epic',
  '{"type": "module_mastery", "requirements": {"module_id": 4, "completion": 100}}'::jsonb,
  '{"ml_coins": 350, "xp": 175}'::jsonb, 9, true),

-- 10. Productor Creativo
('Productor Creativo', 'Completa todos los ejercicios del Módulo 5', 'completion', '🎨', 'epic',
  '{"type": "module_mastery", "requirements": {"module_id": 5, "completion": 100}}'::jsonb,
  '{"ml_coins": 400, "xp": 200}'::jsonb, 10, true),

-- 11. Maestría Completa
('Maestría Completa', 'Completa todos los 5 módulos', 'completion', '👑', 'legendary',
  '{"type": "all_modules", "requirements": {"modules_count": 5}}'::jsonb,
  '{"ml_coins": 1000, "xp": 500}'::jsonb, 11, true),

-- ============================================================================
-- CATEGORY 3: Dominio Maya (Ranks) - 5 achievements
-- ============================================================================

-- 12. Ascenso Maya - BATAB
('Ascenso Maya: BATAB', 'Alcanza el rango BATAB', 'mastery', '🏛️', 'rare',
  '{"type": "rank_achieved", "requirements": {"rank": "batab"}}'::jsonb,
  '{"ml_coins": 100, "xp": 50}'::jsonb, 12, true),

-- 13. Líder HOLCATTE
('Líder HOLCATTE', 'Alcanza el rango HOLCATTE', 'mastery', '🛡️', 'epic',
  '{"type": "rank_achieved", "requirements": {"rank": "holcatte"}}'::jsonb,
  '{"ml_coins": 200, "xp": 100}'::jsonb, 13, true),

-- 14. Guerrero Maya
('Guerrero Maya', 'Alcanza el rango GUERRERO', 'mastery', '⚔️', 'epic',
  '{"type": "rank_achieved", "requirements": {"rank": "guerrero"}}'::jsonb,
  '{"ml_coins": 500, "xp": 250}'::jsonb, 14, true),

-- 15. Mercenario Legendario
('Mercenario Legendario', 'Alcanza el rango máximo MERCENARIO', 'mastery', '👑', 'legendary',
  '{"type": "rank_achieved", "requirements": {"rank": "mercenario"}}'::jsonb,
  '{"ml_coins": 1000, "xp": 500}'::jsonb, 15, true),

-- 16. Ascenso Rápido
('Ascenso Rápido', 'Alcanza BATAB en menos de 2 semanas', 'special', '⚡', 'rare',
  '{"type": "quick_rank", "requirements": {"rank": "batab", "days": 14}}'::jsonb,
  '{"ml_coins": 150, "xp": 75}'::jsonb, 16, true),

-- ============================================================================
-- CATEGORY 4: Excelencia (Mastery) - 5 achievements
-- ============================================================================

-- 17. Perfeccionista
('Perfeccionista', 'Obtén 10 puntuaciones perfectas (100%)', 'mastery', '💯', 'rare',
  '{"type": "perfect_scores", "requirements": {"count": 10}}'::jsonb,
  '{"ml_coins": 200, "xp": 100}'::jsonb, 17, true),

-- 18. Velocista
('Velocista', 'Completa un ejercicio en el top 10% de velocidad', 'special', '🏃', 'rare',
  '{"type": "speed", "requirements": {"percentile": 10}}'::jsonb,
  '{"ml_coins": 150, "xp": 75}'::jsonb, 18, true),

-- 19. Erudito
('Erudito', 'Completa todos los 27 tipos de ejercicios', 'mastery', '📚', 'legendary',
  '{"type": "exercise_variety", "requirements": {"unique_types": 27}}'::jsonb,
  '{"ml_coins": 500, "xp": 250}'::jsonb, 19, true),

-- 20. Sin Ayuda
('Sin Ayuda', 'Completa 20 ejercicios sin usar comodines', 'mastery', '🦾', 'epic',
  '{"type": "no_powerups", "requirements": {"exercises_count": 20}}'::jsonb,
  '{"ml_coins": 300, "xp": 150}'::jsonb, 20, true),

-- 21. Triple Corona
('Triple Corona', 'Completa 3 módulos con 100% en todos los ejercicios', 'mastery', '🏆', 'legendary',
  '{"type": "perfect_modules", "requirements": {"modules_count": 3}}'::jsonb,
  '{"ml_coins": 750, "xp": 375}'::jsonb, 21, true),

-- ============================================================================
-- CATEGORY 5: Social & Especiales - 6 achievements
-- ============================================================================

-- 22. Líder de Equipo
('Líder de Equipo', 'Crea un equipo y recluta 5 miembros', 'social', '👥', 'common',
  '{"type": "team_leader", "requirements": {"team_members": 5}}'::jsonb,
  '{"ml_coins": 100, "xp": 50}'::jsonb, 22, true),

-- 23. Competidor
('Competidor', 'Gana tu primera competencia', 'social', '🥇', 'rare',
  '{"type": "competition_win", "requirements": {"wins": 1}}'::jsonb,
  '{"ml_coins": 200, "xp": 100}'::jsonb, 23, true),

-- 24. Mentor
('Mentor', 'Ayuda a 5 estudiantes diferentes', 'social', '🤝', 'epic',
  '{"type": "mentor", "requirements": {"students_helped": 5}}'::jsonb,
  '{"ml_coins": 150, "xp": 75}'::jsonb, 24, true),

-- 25. Científico Curie
('Científico Curie', 'Explora todo el contenido sobre Marie Curie', 'special', '🧪', 'epic',
  '{"type": "content_exploration", "requirements": {"topic": "marie_curie", "completion": 100}}'::jsonb,
  '{"ml_coins": 300, "xp": 150}'::jsonb, 25, true),

-- 26. Coleccionista
('Coleccionista', 'Desbloquea 10 logros diferentes', 'special', '🎖️', 'rare',
  '{"type": "achievement_count", "requirements": {"achievements": 10}}'::jsonb,
  '{"ml_coins": 250, "xp": 125}'::jsonb, 26, true),

-- 27. Millonario ML
('Millonario ML', 'Acumula 10,000 ML Coins totales ganados', 'special', '💰', 'legendary',
  '{"type": "coins_milestone", "requirements": {"total_earned": 10000}}'::jsonb,
  '{"ml_coins": 1000, "xp": 500}'::jsonb, 27, true),

-- ============================================================================
-- BONUS ACHIEVEMENTS (Hidden/Secret) - 3 achievements
-- ============================================================================

-- 28. Madrugador
('Madrugador', 'Completa un ejercicio antes de las 6 AM', 'special', '🌅', 'rare',
  '{"type": "time_based", "requirements": {"hour_before": 6}}'::jsonb,
  '{"ml_coins": 100, "xp": 50}'::jsonb, 28, true),

-- 29. Noctámbulo
('Noctámbulo', 'Completa un ejercicio después de las 11 PM', 'special', '🌙', 'rare',
  '{"type": "time_based", "requirements": {"hour_after": 23}}'::jsonb,
  '{"ml_coins": 100, "xp": 50}'::jsonb, 29, true),

-- 30. Racha Imparable
('Racha Imparable', 'Mantén una racha de 30 días consecutivos', 'streak', '🔥', 'legendary',
  '{"type": "streak", "requirements": {"days": 30}}'::jsonb,
  '{"ml_coins": 500, "xp": 250}'::jsonb, 30, true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify achievements were inserted
SELECT
  category,
  rarity,
  COUNT(*) as achievement_count,
  SUM((rewards->>'ml_coins')::INT) as total_ml_rewards
FROM gamification_system.achievements
GROUP BY category, rarity
ORDER BY category, rarity;

-- Show all achievements summary
SELECT
  name,
  category,
  rarity,
  (rewards->>'ml_coins')::INT as ml_coins,
  (rewards->>'xp')::INT as xp
FROM gamification_system.achievements
ORDER BY order_index;

-- ============================================================================
-- NOTES
-- ============================================================================

/**
 * ACHIEVEMENT DISTRIBUTION:
 *
 * By Category:
 * - Progress: 5 achievements
 * - Completion: 6 achievements
 * - Mastery/Ranks: 10 achievements
 * - Social: 3 achievements
 * - Special: 6 achievements
 * - Streak: 2 achievements (included in categories above)
 *
 * By Rarity:
 * - Common: 6 achievements (50-100 ML)
 * - Rare: 10 achievements (100-200 ML)
 * - Epic: 8 achievements (200-400 ML)
 * - Legendary: 6 achievements (500-1000 ML)
 *
 * Total ML Coins available from achievements: 10,050 ML
 * Total XP available from achievements: 5,025 XP
 *
 * TOTAL: 30 Achievements
 */
