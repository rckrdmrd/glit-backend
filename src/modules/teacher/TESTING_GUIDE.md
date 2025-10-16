# Teacher Module Testing Guide

Complete guide for testing all 28 Teacher API endpoints with example requests and expected responses.

## Prerequisites

- Backend server running on `http://localhost:3001`
- Valid teacher JWT token (set in Authorization header)
- PostgreSQL database with teacher schema initialized
- Test data: at least one classroom, student, and assignment

## Authentication

All endpoints require authentication with teacher role.

```bash
# Get auth token (login as teacher)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'

# Set token for subsequent requests
TOKEN="your-jwt-token-here"
```

---

## Classroom Management Endpoints (8 endpoints)

### 1. GET /api/teacher/classrooms
**Get all classrooms for authenticated teacher**

```bash
curl -X GET "http://localhost:3001/api/teacher/classrooms?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20)
- `sortBy` (optional): Sort field (default: 'created_at')
- `order` (optional): 'asc' or 'desc' (default: 'desc')

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "teacher_id": "uuid",
      "name": "Grade 10 Mathematics",
      "description": "Advanced algebra and geometry",
      "grade_level": "10",
      "subject": "Mathematics",
      "is_active": true,
      "student_count": "15",
      "created_at": "2025-10-16T00:00:00Z",
      "updated_at": "2025-10-16T00:00:00Z"
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

### 2. POST /api/teacher/classrooms
**Create new classroom**

```bash
curl -X POST http://localhost:3001/api/teacher/classrooms \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grade 11 Computer Science",
    "description": "Introduction to programming and algorithms",
    "grade_level": "11",
    "subject": "Computer Science"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-classroom-uuid",
    "teacher_id": "teacher-uuid",
    "name": "Grade 11 Computer Science",
    "description": "Introduction to programming and algorithms",
    "grade_level": "11",
    "subject": "Computer Science",
    "is_active": true,
    "created_at": "2025-10-16T00:00:00Z",
    "updated_at": "2025-10-16T00:00:00Z"
  }
}
```

### 3. GET /api/teacher/classrooms/:id
**Get classroom details**

```bash
curl -X GET http://localhost:3001/api/teacher/classrooms/classroom-uuid \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "classroom-uuid",
    "teacher_id": "teacher-uuid",
    "name": "Grade 10 Mathematics",
    "description": "Advanced algebra",
    "student_count": "15",
    "is_active": true,
    "students": [
      {
        "id": "student-uuid",
        "email": "student1@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "joined_at": "2025-10-01T00:00:00Z"
      }
    ],
    "created_at": "2025-10-16T00:00:00Z",
    "updated_at": "2025-10-16T00:00:00Z"
  }
}
```

### 4. PUT /api/teacher/classrooms/:id
**Update classroom**

```bash
curl -X PUT http://localhost:3001/api/teacher/classrooms/classroom-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grade 10 Advanced Mathematics",
    "description": "Updated description",
    "is_active": true
  }'
```

### 5. DELETE /api/teacher/classrooms/:id
**Delete classroom**

```bash
curl -X DELETE http://localhost:3001/api/teacher/classrooms/classroom-uuid \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Classroom deleted successfully"
  }
}
```

### 6. GET /api/teacher/classrooms/:id/students
**Get students in classroom**

```bash
curl -X GET http://localhost:3001/api/teacher/classrooms/classroom-uuid/students \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "student-uuid",
      "email": "student1@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "display_name": "Johnny",
      "avatar_url": "https://...",
      "joined_at": "2025-10-01T00:00:00Z"
    }
  ]
}
```

### 7. POST /api/teacher/classrooms/:id/students
**Add students to classroom (bulk)**

```bash
curl -X POST http://localhost:3001/api/teacher/classrooms/classroom-uuid/students \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "student_ids": ["student-uuid-1", "student-uuid-2", "student-uuid-3"]
  }'
```

**Expected Response:**
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

### 8. DELETE /api/teacher/classrooms/:classId/students/:studentId
**Remove student from classroom**

```bash
curl -X DELETE http://localhost:3001/api/teacher/classrooms/classroom-uuid/students/student-uuid \
  -H "Authorization: Bearer $TOKEN"
```

---

## Assignment Management Endpoints (8 endpoints)

### 9. GET /api/teacher/assignments
**Get all assignments**

```bash
curl -X GET "http://localhost:3001/api/teacher/assignments?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

### 10. POST /api/teacher/assignments
**Create assignment**

```bash
curl -X POST http://localhost:3001/api/teacher/assignments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Linear Equations Practice",
    "description": "Complete all exercises on solving linear equations",
    "assignment_type": "homework",
    "exercise_ids": ["exercise-uuid-1", "exercise-uuid-2"],
    "due_date": "2025-10-25T23:59:59Z",
    "total_points": 100
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "assignment-uuid",
    "teacher_id": "teacher-uuid",
    "title": "Linear Equations Practice",
    "description": "Complete all exercises on solving linear equations",
    "assignment_type": "homework",
    "due_date": "2025-10-25T23:59:59Z",
    "total_points": 100,
    "is_published": false,
    "created_at": "2025-10-16T00:00:00Z",
    "updated_at": "2025-10-16T00:00:00Z"
  }
}
```

### 11. GET /api/teacher/assignments/:id
**Get assignment details**

```bash
curl -X GET http://localhost:3001/api/teacher/assignments/assignment-uuid \
  -H "Authorization: Bearer $TOKEN"
```

### 12. PUT /api/teacher/assignments/:id
**Update assignment**

```bash
curl -X PUT http://localhost:3001/api/teacher/assignments/assignment-uuid \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "is_published": true
  }'
```

### 13. DELETE /api/teacher/assignments/:id
**Delete assignment**

```bash
curl -X DELETE http://localhost:3001/api/teacher/assignments/assignment-uuid \
  -H "Authorization: Bearer $TOKEN"
```

### 14. POST /api/teacher/assignments/:id/assign
**Assign to classrooms/students**

```bash
curl -X POST http://localhost:3001/api/teacher/assignments/assignment-uuid/assign \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "classroom_ids": ["classroom-uuid-1", "classroom-uuid-2"],
    "student_ids": ["student-uuid-1"]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "message": "Assignment assigned successfully",
    "assigned": {
      "classrooms": 2,
      "students": 1
    }
  }
}
```

### 15. GET /api/teacher/assignments/:id/submissions
**Get assignment submissions**

```bash
curl -X GET http://localhost:3001/api/teacher/assignments/assignment-uuid/submissions \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "submission-uuid",
      "assignment_id": "assignment-uuid",
      "student_id": "student-uuid",
      "student_name": "John Doe",
      "student_email": "john@example.com",
      "status": "submitted",
      "score": null,
      "submitted_at": "2025-10-20T10:30:00Z",
      "graded_at": null
    }
  ]
}
```

### 16. POST /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade
**Grade submission**

```bash
curl -X POST http://localhost:3001/api/teacher/assignments/assignment-uuid/submissions/submission-uuid/grade \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 85,
    "feedback": "Great work! Review chapter 5 for improvement."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "assignment_id": "assignment-uuid",
    "student_id": "student-uuid",
    "status": "graded",
    "score": 85,
    "feedback": "Great work! Review chapter 5 for improvement.",
    "letter_grade": "B",
    "percentage": 85,
    "graded_at": "2025-10-16T12:00:00Z",
    "graded_by": "teacher-uuid"
  },
  "message": "Submission graded successfully"
}
```

---

## Grading Endpoints (4 endpoints)

### 17. GET /api/teacher/submissions/:id
**Get submission details**

```bash
curl -X GET http://localhost:3001/api/teacher/submissions/submission-uuid \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "assignment_id": "assignment-uuid",
    "assignment_title": "Linear Equations Practice",
    "assignment_max_score": 100,
    "student_id": "student-uuid",
    "student_email": "john@example.com",
    "student_first_name": "John",
    "student_last_name": "Doe",
    "status": "submitted",
    "score": null,
    "feedback": null,
    "submitted_at": "2025-10-20T10:30:00Z",
    "graded_at": null,
    "graded_by": null
  }
}
```

### 18. POST /api/teacher/submissions/:id/grade
**Submit grade for submission**

```bash
curl -X POST http://localhost:3001/api/teacher/submissions/submission-uuid/grade \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "score": 92,
    "feedback": "Excellent work! Keep it up."
  }'
```

### 19. POST /api/teacher/submissions/:id/feedback
**Add feedback to submission**

```bash
curl -X POST http://localhost:3001/api/teacher/submissions/submission-uuid/feedback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Additional comment: Focus on problem-solving techniques."
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "submission-uuid",
    "feedback": "Additional comment: Focus on problem-solving techniques.",
    "updated_at": "2025-10-16T13:00:00Z"
  },
  "message": "Feedback added successfully"
}
```

### 20. GET /api/teacher/submissions/pending
**Get pending submissions**

```bash
curl -X GET "http://localhost:3001/api/teacher/submissions/pending?page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "submission-uuid",
      "assignment_id": "assignment-uuid",
      "assignment_title": "Linear Equations Practice",
      "assignment_max_score": 100,
      "assignment_type": "homework",
      "student_id": "student-uuid",
      "student_email": "john@example.com",
      "student_first_name": "John",
      "student_last_name": "Doe",
      "student_display_name": "Johnny",
      "student_avatar_url": "https://...",
      "status": "submitted",
      "submitted_at": "2025-10-20T10:30:00Z"
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

---

## Student Progress Endpoints (4 endpoints)

### 21. GET /api/teacher/students/:id/progress
**Get student progress**

```bash
curl -X GET http://localhost:3001/api/teacher/students/student-uuid/progress \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "studentId": "student-uuid",
    "studentName": "John Doe",
    "studentEmail": "john@example.com",
    "completedExercises": 45,
    "totalExercises": 100,
    "averageScore": 78.5,
    "totalTimeSpent": 1250,
    "currentStreak": 7,
    "lastActive": "2025-10-16T00:00:00Z",
    "strugglingAreas": ["Quadratic Equations", "Logarithms"],
    "assignments": {
      "total": 10,
      "completed": 8,
      "pending": 2,
      "averageScore": 82.5
    }
  }
}
```

### 22. GET /api/teacher/students/:id/analytics
**Get student analytics**

```bash
curl -X GET http://localhost:3001/api/teacher/students/student-uuid/analytics \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "studentId": "student-uuid",
    "studentName": "John Doe",
    "studentEmail": "john@example.com",
    "overallStats": {
      "totalExercises": 100,
      "completedExercises": 45,
      "averageScore": 78.5,
      "totalCoins": 4500,
      "currentRank": "Advanced",
      "streakDays": 7
    },
    "modulePerformance": [
      {
        "module_id": "module-uuid",
        "module_name": "Algebra Basics",
        "exercises_attempted": 20,
        "exercises_completed": 18,
        "average_score": 85.5,
        "time_spent_minutes": 450
      }
    ],
    "recentActivity": [
      {
        "exercise_id": "exercise-uuid",
        "exercise_title": "Solving Linear Equations",
        "module_name": "Algebra Basics",
        "score": 90,
        "completed_at": "2025-10-16T10:00:00Z",
        "attempts": 2
      }
    ],
    "assignmentHistory": [
      {
        "assignment_id": "assignment-uuid",
        "assignment_title": "Linear Equations Practice",
        "assignment_type": "homework",
        "status": "graded",
        "score": 85,
        "max_score": 100,
        "submitted_at": "2025-10-15T20:00:00Z",
        "graded_at": "2025-10-16T09:00:00Z",
        "feedback": "Great work!"
      }
    ]
  }
}
```

### 23. POST /api/teacher/students/:id/note
**Add teacher note**

```bash
curl -X POST http://localhost:3001/api/teacher/students/student-uuid/note \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Student shows great improvement in problem-solving. Consider advanced topics.",
    "is_private": true
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "id": "note-uuid",
    "teacher_id": "teacher-uuid",
    "student_id": "student-uuid",
    "note": "Student shows great improvement in problem-solving. Consider advanced topics.",
    "is_private": true,
    "created_at": "2025-10-16T12:00:00Z"
  },
  "message": "Teacher note added successfully"
}
```

### 24. GET /api/teacher/students/:id/notes
**Get teacher notes for student**

```bash
curl -X GET http://localhost:3001/api/teacher/students/student-uuid/notes \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "note-uuid",
      "teacher_id": "teacher-uuid",
      "student_id": "student-uuid",
      "note": "Student shows great improvement",
      "is_private": true,
      "created_at": "2025-10-16T12:00:00Z",
      "teacher_email": "teacher@example.com",
      "teacher_first_name": "Jane",
      "teacher_last_name": "Smith"
    }
  ]
}
```

---

## Analytics Endpoints (5 endpoints)

### 25. GET /api/teacher/analytics/classroom/:id
**Get classroom analytics**

```bash
curl -X GET http://localhost:3001/api/teacher/analytics/classroom/classroom-uuid \
  -H "Authorization: Bearer $TOKEN"
```

### 26. GET /api/teacher/analytics/student/:id
**Get student analytics (same as endpoint 22)**

```bash
curl -X GET http://localhost:3001/api/teacher/analytics/student/student-uuid \
  -H "Authorization: Bearer $TOKEN"
```

### 27. GET /api/teacher/analytics/assignment/:id
**Get assignment analytics**

```bash
curl -X GET http://localhost:3001/api/teacher/analytics/assignment/assignment-uuid \
  -H "Authorization: Bearer $TOKEN"
```

### 28. GET /api/teacher/analytics/engagement
**Get engagement metrics**

```bash
curl -X GET "http://localhost:3001/api/teacher/analytics/engagement?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Unauthorized: Invalid or missing token"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied: Teacher role required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Classroom not found"
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    }
  ]
}
```

---

## Testing with Postman

1. Import the following environment variables:
   - `BASE_URL`: http://localhost:3001
   - `TOKEN`: Your JWT token

2. Create a Postman collection with all 28 endpoints

3. Use Collection Runner to test all endpoints sequentially

---

## Automated Testing

```bash
# Run teacher module tests
npm test -- teacher

# Run integration tests
npm run test:integration -- teacher

# Run with coverage
npm run test:coverage -- teacher
```

---

## Performance Testing

```bash
# Test with multiple concurrent requests
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/teacher/classrooms

# Load testing with k6
k6 run teacher-load-test.js
```

---

## Common Test Scenarios

### Scenario 1: Create Classroom and Add Students
1. POST /api/teacher/classrooms
2. POST /api/teacher/classrooms/:id/students
3. GET /api/teacher/classrooms/:id
4. Verify student count

### Scenario 2: Create and Assign Assignment
1. POST /api/teacher/assignments
2. POST /api/teacher/assignments/:id/assign
3. GET /api/teacher/assignments/:id/submissions
4. Verify submission records created

### Scenario 3: Grade Student Work
1. GET /api/teacher/submissions/pending
2. GET /api/teacher/submissions/:id
3. POST /api/teacher/submissions/:id/grade
4. Verify notification sent

### Scenario 4: Track Student Progress
1. GET /api/teacher/students/:id/progress
2. GET /api/teacher/students/:id/analytics
3. POST /api/teacher/students/:id/note
4. GET /api/teacher/students/:id/notes

---

## Database Verification Queries

```sql
-- Verify classroom created
SELECT * FROM classrooms WHERE teacher_id = 'teacher-uuid';

-- Verify students enrolled
SELECT * FROM classroom_students WHERE classroom_id = 'classroom-uuid';

-- Verify assignment created
SELECT * FROM assignments WHERE teacher_id = 'teacher-uuid';

-- Verify submissions
SELECT * FROM assignment_submissions WHERE assignment_id = 'assignment-uuid';

-- Verify teacher notes
SELECT * FROM teacher_notes WHERE teacher_id = 'teacher-uuid';
```

---

## Notes

- All endpoints require valid teacher authentication
- Pagination defaults to page 1, limit 20
- Timestamps are in ISO 8601 format with timezone
- UUIDs are used for all IDs
- Soft deletes are used where applicable
- Notifications are sent asynchronously
