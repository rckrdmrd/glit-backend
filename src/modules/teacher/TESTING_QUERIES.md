# Testing Queries - Teacher Module

Queries SQL útiles para testing y desarrollo del módulo Teacher.

## Setup: Crear datos de prueba

### 1. Crear un profesor de prueba
```sql
-- Insertar usuario profesor
INSERT INTO auth.users (id, email, encrypted_password, role, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'profesor@test.com',
  'hashed_password_here',
  'admin_teacher',
  CURRENT_TIMESTAMP
);

-- Insertar perfil del profesor
INSERT INTO auth_management.profiles (user_id, first_name, last_name, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Juan',
  'Docente',
  'Prof. Juan'
);
```

### 2. Crear estudiantes de prueba
```sql
-- Insertar 5 estudiantes
INSERT INTO auth.users (id, email, encrypted_password, role, email_confirmed_at)
VALUES
  ('00000000-0000-0000-0000-000000000011', 'estudiante1@test.com', 'hash', 'student', CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000012', 'estudiante2@test.com', 'hash', 'student', CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000013', 'estudiante3@test.com', 'hash', 'student', CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000014', 'estudiante4@test.com', 'hash', 'student', CURRENT_TIMESTAMP),
  ('00000000-0000-0000-0000-000000000015', 'estudiante5@test.com', 'hash', 'student', CURRENT_TIMESTAMP);

-- Insertar perfiles de estudiantes
INSERT INTO auth_management.profiles (user_id, first_name, last_name)
VALUES
  ('00000000-0000-0000-0000-000000000011', 'Ana', 'López'),
  ('00000000-0000-0000-0000-000000000012', 'Carlos', 'García'),
  ('00000000-0000-0000-0000-000000000013', 'María', 'Rodríguez'),
  ('00000000-0000-0000-0000-000000000014', 'Pedro', 'Martínez'),
  ('00000000-0000-0000-0000-000000000015', 'Laura', 'Hernández');
```

### 3. Crear una clase de prueba
```sql
INSERT INTO classrooms (id, teacher_id, name, description, grade_level, subject)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000001',
  'Matemáticas 5to A',
  'Clase de matemáticas para 5to grado',
  '5to',
  'Matemáticas'
);

-- Agregar estudiantes a la clase
INSERT INTO classroom_students (classroom_id, student_id)
VALUES
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000012'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000013'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000014'),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000015');
```

### 4. Crear ejercicios de prueba
```sql
-- Verificar módulos existentes
SELECT * FROM modules LIMIT 5;

-- Insertar ejercicios (ajustar module_id según tu BD)
INSERT INTO exercises (id, module_id, title, difficulty, points)
VALUES
  ('00000000-0000-0000-0000-000000000031', 'module-uuid-here', 'Suma de fracciones', 'easy', 10),
  ('00000000-0000-0000-0000-000000000032', 'module-uuid-here', 'Resta de fracciones', 'easy', 10),
  ('00000000-0000-0000-0000-000000000033', 'module-uuid-here', 'Multiplicación de fracciones', 'medium', 15);
```

### 5. Crear una asignación de prueba
```sql
-- Crear assignment
INSERT INTO assignments (id, teacher_id, title, description, assignment_type, due_date, total_points)
VALUES (
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000001',
  'Tarea de Fracciones',
  'Resolver ejercicios de fracciones',
  'homework',
  CURRENT_TIMESTAMP + INTERVAL '7 days',
  100
);

-- Agregar ejercicios al assignment
INSERT INTO assignment_exercises (assignment_id, exercise_id)
VALUES
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000031'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000032'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000033');

-- Asignar a la clase
INSERT INTO assignment_classrooms (assignment_id, classroom_id)
VALUES (
  '00000000-0000-0000-0000-000000000041',
  '00000000-0000-0000-0000-000000000021'
);

-- Crear submissions para los estudiantes
INSERT INTO assignment_submissions (assignment_id, student_id, status)
VALUES
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000011', 'submitted'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000012', 'graded'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000013', 'in_progress'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000014', 'not_started'),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000015', 'submitted');

-- Calificar algunas submissions
UPDATE assignment_submissions
SET score = 85.5, feedback = 'Buen trabajo', graded_at = CURRENT_TIMESTAMP, graded_by = '00000000-0000-0000-0000-000000000001', status = 'graded'
WHERE assignment_id = '00000000-0000-0000-0000-000000000041' AND student_id = '00000000-0000-0000-0000-000000000012';
```

## Testing: Queries de verificación

### Verificar classroom con estudiantes
```sql
SELECT
  c.*,
  COUNT(cs.student_id) as student_count
FROM classrooms c
LEFT JOIN classroom_students cs ON c.id = cs.classroom_id
WHERE c.teacher_id = '00000000-0000-0000-0000-000000000001'
GROUP BY c.id;
```

### Ver estudiantes en una clase
```sql
SELECT
  u.id,
  u.email,
  p.first_name,
  p.last_name,
  cs.joined_at
FROM classroom_students cs
JOIN auth.users u ON cs.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
WHERE cs.classroom_id = '00000000-0000-0000-0000-000000000021'
ORDER BY p.last_name, p.first_name;
```

### Ver assignments del profesor
```sql
SELECT
  a.*,
  COUNT(DISTINCT ae.exercise_id) as exercise_count,
  COUNT(DISTINCT asub.id) as submission_count
FROM assignments a
LEFT JOIN assignment_exercises ae ON a.id = ae.assignment_id
LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
WHERE a.teacher_id = '00000000-0000-0000-0000-000000000001'
GROUP BY a.id
ORDER BY a.created_at DESC;
```

### Ver assignment con ejercicios
```sql
SELECT
  a.*,
  json_agg(
    json_build_object(
      'id', e.id,
      'title', e.title,
      'difficulty', e.difficulty,
      'points', e.points
    )
  ) FILTER (WHERE e.id IS NOT NULL) as exercises
FROM assignments a
LEFT JOIN assignment_exercises ae ON a.id = ae.assignment_id
LEFT JOIN exercises e ON ae.exercise_id = e.id
WHERE a.id = '00000000-0000-0000-0000-000000000041'
GROUP BY a.id;
```

### Ver submissions de un assignment
```sql
SELECT
  s.*,
  u.email,
  p.first_name,
  p.last_name
FROM assignment_submissions s
JOIN auth.users u ON s.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
WHERE s.assignment_id = '00000000-0000-0000-0000-000000000041'
ORDER BY s.submitted_at DESC NULLS LAST;
```

### Classroom Analytics
```sql
SELECT
  u.id as student_id,
  p.first_name,
  p.last_name,
  u.email,
  COUNT(DISTINCT asub.id) as total_assignments,
  COUNT(DISTINCT asub.id) FILTER (WHERE asub.status IN ('submitted', 'graded')) as completed_assignments,
  COALESCE(AVG(asub.score), 0) as average_score,
  COALESCE(us.ml_coins, 0) as ml_coins,
  COALESCE(us.current_rank, 'nacom') as rank
FROM classroom_students cs
JOIN auth.users u ON cs.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
LEFT JOIN gamification_system.user_stats us ON u.id = us.user_id
WHERE cs.classroom_id = '00000000-0000-0000-0000-000000000021'
GROUP BY u.id, p.first_name, p.last_name, u.email, us.ml_coins, us.current_rank
ORDER BY p.last_name, p.first_name;
```

### Assignment Analytics
```sql
SELECT
  asub.id,
  asub.student_id,
  COALESCE(p.display_name, p.first_name || ' ' || p.last_name, u.email) as student_name,
  asub.submitted_at,
  asub.score,
  asub.status,
  EXTRACT(EPOCH FROM (asub.submitted_at - asub.created_at)) / 60 as time_taken_minutes
FROM assignment_submissions asub
JOIN auth.users u ON asub.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
WHERE asub.assignment_id = '00000000-0000-0000-0000-000000000041'
ORDER BY asub.submitted_at DESC NULLS LAST;
```

## Cleanup: Eliminar datos de prueba

```sql
-- Eliminar en orden inverso para respetar foreign keys

-- Submissions
DELETE FROM assignment_submissions WHERE assignment_id = '00000000-0000-0000-0000-000000000041';

-- Assignment relationships
DELETE FROM assignment_exercises WHERE assignment_id = '00000000-0000-0000-0000-000000000041';
DELETE FROM assignment_classrooms WHERE assignment_id = '00000000-0000-0000-0000-000000000041';

-- Assignment
DELETE FROM assignments WHERE id = '00000000-0000-0000-0000-000000000041';

-- Exercises (opcional)
DELETE FROM exercises WHERE id IN (
  '00000000-0000-0000-0000-000000000031',
  '00000000-0000-0000-0000-000000000032',
  '00000000-0000-0000-0000-000000000033'
);

-- Classroom students
DELETE FROM classroom_students WHERE classroom_id = '00000000-0000-0000-0000-000000000021';

-- Classroom
DELETE FROM classrooms WHERE id = '00000000-0000-0000-0000-000000000021';

-- Student profiles y users
DELETE FROM auth_management.profiles WHERE user_id IN (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015'
);

DELETE FROM auth.users WHERE id IN (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000015'
);

-- Teacher profile y user
DELETE FROM auth_management.profiles WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Queries de Performance

### Verificar índices
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('classrooms', 'classroom_students', 'assignments', 'assignment_submissions')
ORDER BY tablename, indexname;
```

### Estadísticas de tablas
```sql
SELECT
  schemaname,
  tablename,
  n_live_tup as row_count,
  n_dead_tup as dead_rows
FROM pg_stat_user_tables
WHERE tablename IN ('classrooms', 'classroom_students', 'assignments', 'assignment_submissions')
ORDER BY tablename;
```

### Query más lentas (requiere pg_stat_statements)
```sql
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%classrooms%' OR query LIKE '%assignments%'
ORDER BY mean_time DESC
LIMIT 10;
```
