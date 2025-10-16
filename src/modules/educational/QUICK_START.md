# Educational Module - Quick Start Guide

## 🚀 Getting Started

### 1. Add Routes to Express App

Edit `/home/isem/workspace/projects/glit/backend/src/app.ts`:

```typescript
import { createEducationalRoutes } from './modules/educational';
import { pool } from './database/pool';

// Add after other routes
app.use('/api/educational', createEducationalRoutes(pool));
app.use('/api/progress', createEducationalRoutes(pool));
app.use('/api/analytics', createEducationalRoutes(pool));
```

### 2. Test Endpoints

```bash
# Start server
npm run dev

# Test modules endpoint
curl http://localhost:3001/api/educational/modules

# Test exercises endpoint
curl http://localhost:3001/api/educational/exercises
```

### 3. Seed Database (Optional)

```sql
-- Insert sample module
INSERT INTO educational_content.modules (
  title, description, order_index, difficulty_level,
  xp_reward, ml_coins_reward, is_published
) VALUES (
  'Los Primeros Pasos de Marie',
  'Comprensión Literal sobre la vida temprana de Marie Curie',
  1, 'beginner', 100, 50, true
);

-- Insert sample exercise
INSERT INTO educational_content.exercises (
  module_id, title, description, exercise_type,
  order_index, content, difficulty_level
) VALUES (
  'module-uuid-here',
  'Crucigrama de Marie Curie',
  'Resuelve el crucigrama sobre Marie Curie',
  'crucigrama_cientifico',
  1,
  '{"grid": {"rows": 10, "cols": 10}, "clues": {"across": [], "down": []}}',
  'beginner'
);
```

## 📋 API Quick Reference

### Modules
- `GET /api/educational/modules` - List modules
- `GET /api/educational/modules/:id` - Get module details
- `POST /api/educational/modules` - Create module (admin)
- `PUT /api/educational/modules/:id` - Update module (admin)
- `DELETE /api/educational/modules/:id` - Delete module (admin)

### Exercises
- `GET /api/educational/exercises` - List exercises
- `GET /api/educational/exercises/:id` - Get exercise details
- `POST /api/educational/exercises/:id/submit` - Submit attempt
- `POST /api/educational/exercises` - Create exercise (admin)

### Progress
- `GET /api/progress/user/:userId` - User progress
- `GET /api/progress/user/:userId/dashboard` - Dashboard data
- `GET /api/progress/attempts/:userId` - Attempt history

### Analytics
- `GET /api/analytics/:userId` - User analytics
- `GET /api/analytics/classroom/:classroomId` - Classroom analytics

## 🎯 Exercise Types (27 Total)

### Automatic Scoring (13 types)
1. crucigrama_cientifico
2. sopa_letras
3. emparejamiento
4. linea_tiempo_visual
5. quiz_tiktok
6. comprension_auditiva
7. navegacion_hipertextual
8. analisis_memes
9. verificador_fake_news
10. call_to_action
11. texto_movimiento
12. mapa_conceptual
13. collage_prensa

### Manual Scoring (14 types)
14. detective_textual
15. construccion_hipotesis
16. prediccion_narrativa
17. puzzle_contexto
18. rueda_inferencias
19. tribunal_opiniones
20. debate_digital
21. analisis_fuentes
22. podcast_argumentativo
23. matriz_perspectivas
24. infografia_interactiva
25. diario_multimedia
26. comic_digital
27. video_carta

## 💯 Scoring System

```typescript
finalScore = (baseScore × difficulty × rank × streak) + bonuses - penalties

Multipliers:
- Difficulty: beginner (1.0), intermediate (1.25), advanced (1.5)
- Rank: nacom (1.0) → mercenario (2.0)
- Streak: +5% per day (max +50%)

Bonuses:
- Perfect: +10
- No Hints: +5
- Speed: +5
- First Attempt: +10

Penalties:
- Powerup: -5 each
```

## 🔗 Integration Example

```typescript
// Submit exercise
const response = await fetch('/api/educational/exercises/exercise-id/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    answers: { answer1: 'value1' },
    timeSpent: 180,
    powerupsUsed: []
  })
});

const result = await response.json();
// result.data.score = 95
// result.data.rewards.mlCoins = 12
// result.data.rewards.xp = 28
```

## 📊 Dashboard Data Example

```typescript
GET /api/progress/user/{userId}/dashboard

Response:
{
  "currentModule": { "title": "Module 1", "progress": 60 },
  "recentActivities": [...],
  "upcomingExercises": [...],
  "progressCharts": {
    "moduleProgress": [{ "moduleId": "...", "percentage": 60 }]
  },
  "stats": {
    "mlCoins": 150,
    "totalXP": 420,
    "currentRank": "batab",
    "streakDays": 7,
    "exercisesCompleted": 15
  }
}
```

## ⚡ Performance Tips

1. **Use Pagination**: Always set `?page=1&limit=20`
2. **Cache Results**: Module and exercise data rarely changes
3. **Filter Queries**: Use `?moduleId=X&difficulty=Y`
4. **Batch Requests**: Combine related queries when possible

## 🛠️ Troubleshooting

### Issue: Module not found
```
Error: Module not found
Solution: Check if module.is_published = true
```

### Issue: Score calculation error
```
Error: Invalid exercise type
Solution: Verify exerciseType matches ExerciseType enum
```

### Issue: Progress not updating
```
Error: User progress not found
Solution: First attempt creates progress record automatically
```

## 📚 Additional Resources

- **Full Documentation**: `/backend/EDUCATIONAL_IMPLEMENTATION_REPORT.md`
- **Type Definitions**: `/backend/src/modules/educational/educational.types.ts`
- **API Reference**: `/docs/projects/glit/01-architecture/backend-api-reference.md`

## 🎓 Next Steps

1. Add authentication middleware
2. Implement request validation
3. Add caching layer
4. Write unit tests
5. Deploy to staging

---

**Need Help?** Check the full implementation report for detailed documentation.
