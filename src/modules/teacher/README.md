# Teacher Module

Módulo completo de APIs para profesores en la plataforma GLIT.

## Descripción

Este módulo proporciona todas las funcionalidades necesarias para que los profesores gestionen clases, asignaciones y analicen el rendimiento de sus estudiantes.

## Estructura del Módulo

```
teacher/
├── index.ts                      # Exporta routes y types
├── teacher.types.ts              # TypeScript interfaces
├── teacher.middleware.ts         # Authorization middleware
├── teacher.schema.sql            # Database schema
├── README.md                     # Esta documentación
│
├── classroom.controller.ts       # Classroom HTTP handlers
├── classroom.service.ts          # Classroom business logic
├── classroom.repository.ts       # Classroom database operations
├── classroom.routes.ts           # Classroom routes
├── classroom.validation.ts       # Classroom Joi schemas
│
├── assignments.controller.ts     # Assignment HTTP handlers
├── assignments.service.ts        # Assignment business logic
├── assignments.repository.ts     # Assignment database operations
├── assignments.routes.ts         # Assignment routes
├── assignments.validation.ts     # Assignment Joi schemas
│
├── analytics.controller.ts       # Analytics HTTP handlers
├── analytics.service.ts          # Analytics business logic
├── analytics.repository.ts       # Analytics database operations
└── analytics.routes.ts           # Analytics routes
```

## Endpoints Implementados (20 Total)

### Classroom Management (7 endpoints)

#### 1. POST /api/teacher/classrooms
Crear una nueva clase.

**Request:**
```json
{
  "name": "Matemáticas 5to A",
  "description": "Clase de matemáticas para 5to grado",
  "school_id": "uuid-optional",
  "grade_level": "5to",
  "subject": "Matemáticas"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "teacher_id": "uuid",
    "name": "Matemáticas 5to A",
    "description": "Clase de matemáticas para 5to grado",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### 2. GET /api/teacher/classrooms
Listar todas las clases del profesor.

**Query params:**
- `page` (default: 1)
- `limit` (default: 20)
- `sortBy` (default: created_at)
- `order` (asc|desc, default: desc)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Matemáticas 5to A",
      "student_count": 25,
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### 3. GET /api/teacher/classrooms/:id
Obtener detalles de una clase específica.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Matemáticas 5to A",
    "student_count": 25,
    "students": [
      {
        "id": "uuid",
        "email": "estudiante@example.com",
        "first_name": "Juan",
        "last_name": "Pérez",
        "joined_at": "2025-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### 4. PUT /api/teacher/classrooms/:id
Actualizar información de la clase.

**Request:**
```json
{
  "name": "Matemáticas 5to B",
  "description": "Nueva descripción",
  "is_active": false
}
```

#### 5. DELETE /api/teacher/classrooms/:id
Eliminar una clase (y todas sus relaciones).

#### 6. POST /api/teacher/classrooms/:id/students
Agregar estudiantes a la clase (bulk operation).

**Request:**
```json
{
  "student_ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Successfully added 3 student(s)",
    "added": 3,
    "invalid": []
  }
}
```

#### 7. DELETE /api/teacher/classrooms/:classId/students/:studentId
Remover un estudiante de la clase.

---

### Assignment Management (8 endpoints)

#### 8. POST /api/teacher/assignments
Crear una nueva asignación.

**Request:**
```json
{
  "title": "Tarea de Álgebra #1",
  "description": "Resolver ecuaciones lineales",
  "assignment_type": "homework",
  "exercise_ids": ["uuid1", "uuid2"],
  "due_date": "2025-01-20T23:59:59Z",
  "total_points": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "teacher_id": "uuid",
    "title": "Tarea de Álgebra #1",
    "assignment_type": "homework",
    "exercises": [
      {
        "id": "uuid1",
        "title": "Ejercicio 1",
        "difficulty": "medium",
        "points": 50
      }
    ],
    "is_published": false,
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

#### 9. GET /api/teacher/assignments
Listar todas las asignaciones del profesor.

**Query params:**
- `page`, `limit`, `sortBy`, `order`

#### 10. GET /api/teacher/assignments/:id
Obtener detalles de una asignación.

#### 11. PUT /api/teacher/assignments/:id
Actualizar asignación.

**Request:**
```json
{
  "title": "Nuevo título",
  "due_date": "2025-01-25T23:59:59Z",
  "is_published": true
}
```

#### 12. DELETE /api/teacher/assignments/:id
Eliminar asignación.

#### 13. POST /api/teacher/assignments/:id/assign
Asignar la tarea a clases y/o estudiantes.

**Request:**
```json
{
  "classroom_ids": ["uuid1", "uuid2"],
  "student_ids": ["uuid3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Assignment assigned successfully",
    "assigned": 52
  }
}
```

#### 14. GET /api/teacher/assignments/:id/submissions
Ver todas las entregas de una asignación.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "student_id": "uuid",
      "first_name": "Juan",
      "last_name": "Pérez",
      "submitted_at": "2025-01-16T15:30:00Z",
      "status": "submitted",
      "score": null,
      "feedback": null
    }
  ]
}
```

#### 15. POST /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade
Calificar una entrega.

**Request:**
```json
{
  "score": 85.5,
  "feedback": "Buen trabajo, pero revisa el ejercicio 3"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "score": 85.5,
    "feedback": "Buen trabajo, pero revisa el ejercicio 3",
    "graded_at": "2025-01-17T10:00:00Z",
    "graded_by": "teacher-uuid",
    "status": "graded"
  }
}
```

---

### Analytics APIs (5 endpoints)

#### 16. GET /api/teacher/analytics/classroom/:id
Obtener análisis de rendimiento de una clase.

**Response:**
```json
{
  "success": true,
  "data": {
    "classroom_id": "uuid",
    "classroom_name": "Matemáticas 5to A",
    "total_students": 25,
    "active_students": 22,
    "average_score": 78.5,
    "total_assignments": 10,
    "completion_rate": 85,
    "students": [
      {
        "student_id": "uuid",
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan@example.com",
        "total_assignments": 10,
        "completed_assignments": 9,
        "average_score": 85.3,
        "ml_coins": 1500,
        "rank": "batab",
        "last_activity": "2025-01-17T15:00:00Z"
      }
    ]
  }
}
```

#### 17. GET /api/teacher/analytics/student/:id
Obtener análisis de rendimiento de un estudiante.

**Response:**
```json
{
  "success": true,
  "data": {
    "student_id": "uuid",
    "student_name": "Juan Pérez",
    "overall_stats": {
      "total_exercises": 120,
      "completed_exercises": 95,
      "average_score": 82.5,
      "total_coins": 2500,
      "current_rank": "holcatte",
      "streak_days": 15
    },
    "module_performance": [
      {
        "module_id": "uuid",
        "module_name": "Álgebra Básica",
        "exercises_attempted": 25,
        "exercises_completed": 22,
        "average_score": 85.0,
        "time_spent_minutes": 450
      }
    ],
    "recent_activity": [
      {
        "exercise_id": "uuid",
        "exercise_title": "Ecuaciones lineales",
        "module_name": "Álgebra Básica",
        "score": 90,
        "completed_at": "2025-01-17T14:30:00Z",
        "attempts": 2
      }
    ]
  }
}
```

#### 18. GET /api/teacher/analytics/assignment/:id
Obtener análisis de una asignación.

**Response:**
```json
{
  "success": true,
  "data": {
    "assignment_id": "uuid",
    "assignment_title": "Tarea de Álgebra #1",
    "total_assigned": 50,
    "total_submitted": 42,
    "total_graded": 35,
    "average_score": 78.5,
    "submission_rate": 84,
    "submissions": [
      {
        "student_id": "uuid",
        "student_name": "Juan Pérez",
        "submitted_at": "2025-01-16T15:30:00Z",
        "score": 85.5,
        "status": "graded",
        "time_taken_minutes": 45
      }
    ]
  }
}
```

#### 19. GET /api/teacher/analytics/engagement
Obtener métricas de engagement de los estudiantes.

**Query params:**
- `startDate` (ISO date)
- `endDate` (ISO date)

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "2025-01-01 to 2025-01-31",
    "total_students": 75,
    "active_students": 68,
    "engagement_rate": 91,
    "average_session_duration": 0,
    "total_exercises_completed": 1250,
    "daily_activity": [
      {
        "date": "2025-01-17",
        "active_students": 52,
        "exercises_completed": 145,
        "average_score": 82.3
      }
    ]
  }
}
```

#### 20. GET /api/teacher/analytics/reports
Generar reportes en diferentes formatos.

**Query params:**
- `report_type` (classroom|student|assignment)
- `resource_id` (UUID del recurso)
- `format` (json|csv, default: json)
- `start_date` (ISO date, optional)
- `end_date` (ISO date, optional)

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "report_type": "classroom",
    "resource_id": "uuid",
    "generated_at": "2025-01-17T10:00:00Z",
    "format": "json",
    "data": { /* classroom analytics */ }
  }
}
```

**Response (CSV):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="classroom_uuid_report.csv"

Student ID,First Name,Last Name,Email,Total Assignments,Completed Assignments,Average Score,ML Coins,Rank
uuid1,"Juan","Pérez","juan@example.com",10,9,85.3,1500,"batab"
```

---

## Autenticación y Autorización

### Middleware Implementado

#### 1. `requireTeacherRole`
Verifica que el usuario tenga role `admin_teacher` o `super_admin`.

#### 2. `verifyClassroomOwnership`
Verifica que el profesor sea dueño de la clase.

#### 3. `verifyAssignmentOwnership`
Verifica que el profesor sea dueño de la asignación.

#### 4. `verifyStudentAccess`
Verifica que el profesor tenga acceso al estudiante (está en una de sus clases).

### Permisos por Rol

**admin_teacher:**
- Puede crear, leer, actualizar y eliminar sus propias clases
- Puede crear, leer, actualizar y eliminar sus propias asignaciones
- Puede ver analytics de sus propias clases y estudiantes
- No puede acceder a recursos de otros profesores

**super_admin:**
- Tiene acceso completo a todos los recursos de todos los profesores

## Validaciones

Todas las validaciones se implementan con Joi:

### Classroom
- `name`: requerido, 1-255 caracteres
- `description`: opcional, max 1000 caracteres
- `school_id`: opcional, UUID válido
- `grade_level`: opcional, max 50 caracteres
- `subject`: opcional, max 100 caracteres

### Assignment
- `title`: requerido, 1-255 caracteres
- `description`: opcional, max 2000 caracteres
- `assignment_type`: requerido, uno de: practice, quiz, exam, homework
- `exercise_ids`: requerido, array de UUIDs, mínimo 1
- `due_date`: opcional, fecha ISO
- `total_points`: opcional, 0-1000, default 100

### Grading
- `score`: requerido, 0-100
- `feedback`: opcional, max 2000 caracteres

## Base de Datos

### Tablas Necesarias

Ver archivo `teacher.schema.sql` para el schema completo.

**Principales tablas:**
1. `classrooms` - Clases del profesor
2. `classroom_students` - Relación many-to-many clase-estudiantes
3. `assignments` - Tareas asignadas
4. `assignment_exercises` - Ejercicios en cada tarea
5. `assignment_classrooms` - Asignaciones a clases
6. `assignment_students` - Asignaciones a estudiantes individuales
7. `assignment_submissions` - Entregas de estudiantes

### Queries Importantes

**Classroom analytics:**
```sql
SELECT
  u.id, p.first_name, p.last_name,
  COUNT(DISTINCT asub.id) as total_assignments,
  COUNT(DISTINCT asub.id) FILTER (WHERE asub.status IN ('submitted', 'graded')) as completed,
  AVG(asub.score) as average_score
FROM classroom_students cs
JOIN auth.users u ON cs.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
WHERE cs.classroom_id = $1
GROUP BY u.id, p.first_name, p.last_name
```

**Student performance:**
```sql
SELECT
  m.name as module_name,
  COUNT(ep.id) as exercises_attempted,
  AVG(ep.score) as average_score,
  SUM(ep.ml_coins_earned) as total_coins
FROM exercise_progress ep
JOIN exercises e ON ep.exercise_id = e.id
JOIN modules m ON e.module_id = m.id
WHERE ep.user_id = $1
GROUP BY m.id, m.name
```

## Features Especiales

### 1. Bulk Operations
- Agregar múltiples estudiantes a una clase de una vez
- Asignar tareas a múltiples clases/estudiantes simultáneamente

### 2. CSV Export
- Exportar analytics de clase a formato CSV
- Headers personalizados
- Datos formateados correctamente

### 3. Ownership Verification
- Todos los endpoints verifican que el profesor sea dueño del recurso
- Super admin puede acceder a todos los recursos
- Previene acceso no autorizado entre profesores

### 4. Paginación
- Todos los listados soportan paginación
- Query params: page, limit, sortBy, order
- Metadata incluye: total, page, limit, totalPages

### 5. Analytics Completos
- Rendimiento por clase
- Rendimiento individual de estudiantes
- Analytics de asignaciones
- Métricas de engagement
- Actividad diaria

## Uso del Módulo

### Importar en app.ts

```typescript
import { createTeacherRoutes } from './modules/teacher';

const teacherRoutes = createTeacherRoutes(pool);
app.use('/api/teacher', teacherRoutes);
```

### Headers Requeridos

Todos los endpoints requieren:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

El token JWT debe contener:
- `role`: 'admin_teacher' o 'super_admin'
- `id`: UUID del profesor

## Próximos Pasos

### Testing
1. Crear tests unitarios para services
2. Crear tests de integración para endpoints
3. Crear tests de autorización

### Documentación
1. Generar documentación Swagger/OpenAPI
2. Agregar ejemplos de uso con curl
3. Crear guía de migración de BD

### Features Adicionales
1. Notificaciones por email al asignar tareas
2. Bulk grading (calificar múltiples entregas a la vez)
3. Export a Excel (xlsx) además de CSV
4. Dashboard de profesor con métricas en tiempo real
5. Comentarios en entregas (threaded comments)
6. Historial de cambios en asignaciones

## Errores Comunes

### 403 Forbidden
- El usuario no tiene role de profesor
- El profesor intenta acceder a recursos de otro profesor
- Solución: Verificar permisos y ownership

### 404 Not Found
- Recurso no existe
- IDs incorrectos en la URL
- Solución: Verificar UUIDs

### 400 Validation Error
- Datos inválidos en el request body
- Solución: Revisar schema de validación

## Soporte

Para reportar bugs o solicitar features, crear un issue en el repositorio del proyecto.
