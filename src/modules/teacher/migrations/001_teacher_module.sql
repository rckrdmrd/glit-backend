/**
 * Teacher Module Database Migration
 *
 * Creates all tables required for the teacher module:
 * - classrooms
 * - classroom_students
 * - assignments
 * - assignment_exercises
 * - assignment_classrooms
 * - assignment_students
 * - assignment_submissions
 * - teacher_notes
 *
 * Run this script to set up the complete teacher module database schema.
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher_id ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_is_active ON classrooms(is_active);
CREATE INDEX IF NOT EXISTS idx_classrooms_school_id ON classrooms(school_id) WHERE school_id IS NOT NULL;

COMMENT ON TABLE classrooms IS 'Teacher-created classrooms for organizing students';
COMMENT ON COLUMN classrooms.teacher_id IS 'Teacher who created and owns this classroom';
COMMENT ON COLUMN classrooms.school_id IS 'Optional school/organization identifier';
COMMENT ON COLUMN classrooms.is_active IS 'Whether classroom is currently active';

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
CREATE INDEX IF NOT EXISTS idx_classroom_students_classroom_id ON classroom_students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_student_id ON classroom_students(student_id);
CREATE INDEX IF NOT EXISTS idx_classroom_students_joined_at ON classroom_students(joined_at);

COMMENT ON TABLE classroom_students IS 'Students enrolled in classrooms (many-to-many relationship)';

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
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_is_published ON assignments(is_published);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(assignment_type);

COMMENT ON TABLE assignments IS 'Teacher-created assignments';
COMMENT ON COLUMN assignments.assignment_type IS 'Type of assignment: practice, quiz, exam, or homework';
COMMENT ON COLUMN assignments.total_points IS 'Maximum points/score for this assignment';
COMMENT ON COLUMN assignments.is_published IS 'Whether assignment is visible to students';

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
CREATE INDEX IF NOT EXISTS idx_assignment_exercises_assignment_id ON assignment_exercises(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_exercises_exercise_id ON assignment_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_assignment_exercises_order ON assignment_exercises(assignment_id, order_index);

COMMENT ON TABLE assignment_exercises IS 'Exercises included in assignments (many-to-many)';
COMMENT ON COLUMN assignment_exercises.order_index IS 'Display order of exercises in assignment';

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
CREATE INDEX IF NOT EXISTS idx_assignment_classrooms_assignment_id ON assignment_classrooms(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_classrooms_classroom_id ON assignment_classrooms(classroom_id);

COMMENT ON TABLE assignment_classrooms IS 'Assignments assigned to entire classrooms';

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
CREATE INDEX IF NOT EXISTS idx_assignment_students_assignment_id ON assignment_students(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_students_student_id ON assignment_students(student_id);

COMMENT ON TABLE assignment_students IS 'Assignments assigned to individual students';

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
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON assignment_submissions(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_graded_by ON assignment_submissions(graded_by) WHERE graded_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_submitted_at ON assignment_submissions(submitted_at) WHERE submitted_at IS NOT NULL;

COMMENT ON TABLE assignment_submissions IS 'Student submissions for assignments';
COMMENT ON COLUMN assignment_submissions.status IS 'Submission status: not_started, in_progress, submitted, or graded';
COMMENT ON COLUMN assignment_submissions.score IS 'Numeric score given by teacher (0-100 scale)';
COMMENT ON COLUMN assignment_submissions.graded_by IS 'Teacher who graded this submission';

-- ============================================================================
-- TEACHER_NOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS teacher_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    is_private BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher_id ON teacher_notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_student_id ON teacher_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_created_at ON teacher_notes(created_at);
CREATE INDEX IF NOT EXISTS idx_teacher_notes_teacher_student ON teacher_notes(teacher_id, student_id);

COMMENT ON TABLE teacher_notes IS 'Teacher notes about students for tracking progress and observations';
COMMENT ON COLUMN teacher_notes.is_private IS 'Whether note is private to teacher (not visible to student or parents)';

-- ============================================================================
-- TRIGGERS FOR updated_at
-- ============================================================================

-- Trigger function (create only if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
DROP TRIGGER IF EXISTS update_classrooms_updated_at ON classrooms;
CREATE TRIGGER update_classrooms_updated_at
    BEFORE UPDATE ON classrooms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View: Classroom with student counts
CREATE OR REPLACE VIEW classroom_overview AS
SELECT
    c.*,
    COUNT(cs.student_id) as student_count,
    COUNT(DISTINCT ac.assignment_id) as assignment_count
FROM classrooms c
LEFT JOIN classroom_students cs ON c.id = cs.classroom_id
LEFT JOIN assignment_classrooms ac ON c.id = ac.classroom_id
GROUP BY c.id;

COMMENT ON VIEW classroom_overview IS 'Classrooms with student and assignment counts';

-- View: Assignment submission statistics
CREATE OR REPLACE VIEW assignment_submission_stats AS
SELECT
    a.id as assignment_id,
    a.title,
    a.teacher_id,
    COUNT(asub.id) as total_submissions,
    COUNT(asub.id) FILTER (WHERE asub.status = 'submitted') as submitted_count,
    COUNT(asub.id) FILTER (WHERE asub.status = 'graded') as graded_count,
    COUNT(asub.id) FILTER (WHERE asub.status IN ('not_started', 'in_progress')) as pending_count,
    AVG(asub.score) as average_score,
    MAX(asub.submitted_at) as last_submission_at
FROM assignments a
LEFT JOIN assignment_submissions asub ON a.id = asub.assignment_id
GROUP BY a.id, a.title, a.teacher_id;

COMMENT ON VIEW assignment_submission_stats IS 'Assignment submission statistics for quick overview';

-- ============================================================================
-- SAMPLE QUERIES (commented for reference)
-- ============================================================================

/*
-- Get all classrooms for a teacher with student count
SELECT * FROM classroom_overview WHERE teacher_id = 'teacher-uuid';

-- Get pending submissions for grading
SELECT
    asub.*,
    a.title as assignment_title,
    u.email as student_email,
    p.first_name, p.last_name
FROM assignment_submissions asub
JOIN assignments a ON asub.assignment_id = a.id
JOIN auth.users u ON asub.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
WHERE a.teacher_id = 'teacher-uuid' AND asub.status = 'submitted'
ORDER BY asub.submitted_at ASC;

-- Get student performance in a classroom
SELECT
    u.id, u.email,
    p.first_name, p.last_name,
    COUNT(DISTINCT asub.id) as total_assignments,
    COUNT(DISTINCT asub.id) FILTER (WHERE asub.status IN ('submitted', 'graded')) as completed,
    AVG(asub.score) as average_score,
    MAX(asub.submitted_at) as last_submission
FROM classroom_students cs
JOIN auth.users u ON cs.student_id = u.id
LEFT JOIN auth_management.profiles p ON u.id = p.user_id
LEFT JOIN assignment_submissions asub ON u.id = asub.student_id
WHERE cs.classroom_id = 'classroom-uuid'
GROUP BY u.id, u.email, p.first_name, p.last_name;

-- Get assignment analytics
SELECT * FROM assignment_submission_stats WHERE assignment_id = 'assignment-uuid';
*/
