/**
 * Teacher Module Database Schema
 *
 * SQL schema for teacher module tables.
 * This file documents the required database structure.
 */

-- ============================================================================
-- CLASSROOMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    school_id UUID,
    grade_level VARCHAR(50),
    subject VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX idx_classrooms_is_active ON classrooms(is_active);

-- ============================================================================
-- CLASSROOM_STUDENTS TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS classroom_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(classroom_id, student_id)
);

-- Indexes
CREATE INDEX idx_classroom_students_classroom_id ON classroom_students(classroom_id);
CREATE INDEX idx_classroom_students_student_id ON classroom_students(student_id);

-- ============================================================================
-- ASSIGNMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignment_type VARCHAR(50) NOT NULL CHECK (assignment_type IN ('practice', 'quiz', 'exam', 'homework')),
    due_date TIMESTAMP WITH TIME ZONE,
    total_points INTEGER NOT NULL DEFAULT 100,
    is_published BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_is_published ON assignments(is_published);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);

-- ============================================================================
-- ASSIGNMENT_EXERCISES TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assignment_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, exercise_id)
);

-- Indexes
CREATE INDEX idx_assignment_exercises_assignment_id ON assignment_exercises(assignment_id);
CREATE INDEX idx_assignment_exercises_exercise_id ON assignment_exercises(exercise_id);

-- ============================================================================
-- ASSIGNMENT_CLASSROOMS TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assignment_classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, classroom_id)
);

-- Indexes
CREATE INDEX idx_assignment_classrooms_assignment_id ON assignment_classrooms(assignment_id);
CREATE INDEX idx_assignment_classrooms_classroom_id ON assignment_classrooms(classroom_id);

-- ============================================================================
-- ASSIGNMENT_STUDENTS TABLE (Many-to-Many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS assignment_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Indexes
CREATE INDEX idx_assignment_students_assignment_id ON assignment_students(assignment_id);
CREATE INDEX idx_assignment_students_student_id ON assignment_students(student_id);

-- ============================================================================
-- ASSIGNMENT_SUBMISSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submitted_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'submitted', 'graded')),
    score NUMERIC(5,2),
    feedback TEXT,
    graded_at TIMESTAMP WITH TIME ZONE,
    graded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Indexes
CREATE INDEX idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX idx_assignment_submissions_graded_by ON assignment_submissions(graded_by);

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

-- Trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE classrooms IS 'Teacher-created classrooms for organizing students';
COMMENT ON TABLE classroom_students IS 'Students enrolled in classrooms';
COMMENT ON TABLE assignments IS 'Teacher-created assignments';
COMMENT ON TABLE assignment_exercises IS 'Exercises included in assignments';
COMMENT ON TABLE assignment_classrooms IS 'Assignments assigned to classrooms';
COMMENT ON TABLE assignment_students IS 'Assignments assigned to individual students';
COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments';

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================

-- Get all classrooms for a teacher with student count
-- SELECT
--   c.*,
--   COUNT(cs.student_id) as student_count
-- FROM classrooms c
-- LEFT JOIN classroom_students cs ON c.id = cs.classroom_id
-- WHERE c.teacher_id = 'teacher-uuid-here'
-- GROUP BY c.id;

-- Get classroom analytics
-- SELECT
--   u.id, u.email, p.first_name, p.last_name,
--   COUNT(DISTINCT asub.id) as total_assignments,
--   COUNT(DISTINCT asub.id) FILTER (WHERE asub.status = 'submitted' OR asub.status = 'graded') as completed_assignments,
--   AVG(asub.score) as average_score
-- FROM classroom_students cs
-- JOIN auth.users u ON cs.student_id = u.id
-- LEFT JOIN auth_management.profiles p ON u.id = p.user_id
-- LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
-- WHERE cs.classroom_id = 'classroom-uuid-here'
-- GROUP BY u.id, u.email, p.first_name, p.last_name;

-- Get student performance across modules
-- SELECT
--   m.name as module_name,
--   COUNT(ep.id) as exercises_attempted,
--   AVG(ep.score) as average_score,
--   SUM(ep.ml_coins_earned) as total_coins
-- FROM exercise_progress ep
-- JOIN exercises e ON ep.exercise_id = e.id
-- JOIN modules m ON e.module_id = m.id
-- WHERE ep.user_id = 'student-uuid-here'
-- GROUP BY m.id, m.name;
