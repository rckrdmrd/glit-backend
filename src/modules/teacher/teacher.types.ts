/**
 * Teacher Module Types
 *
 * TypeScript interfaces for teacher module.
 */

/**
 * Classroom Interfaces
 */
export interface Classroom {
  id: string;
  teacher_id: string;
  name: string;
  description?: string;
  school_id?: string;
  grade_level?: string;
  subject?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateClassroomDto {
  name: string;
  description?: string;
  school_id?: string;
  grade_level?: string;
  subject?: string;
}

export interface UpdateClassroomDto {
  name?: string;
  description?: string;
  grade_level?: string;
  subject?: string;
  is_active?: boolean;
}

export interface AddStudentsDto {
  student_ids: string[];
}

/**
 * Assignment Interfaces
 */
export interface Assignment {
  id: string;
  teacher_id: string;
  title: string;
  description?: string;
  assignment_type: 'practice' | 'quiz' | 'exam' | 'homework';
  due_date?: Date;
  total_points: number;
  is_published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateAssignmentDto {
  title: string;
  description?: string;
  assignment_type: 'practice' | 'quiz' | 'exam' | 'homework';
  exercise_ids: string[];
  due_date?: string;
  total_points?: number;
}

export interface UpdateAssignmentDto {
  title?: string;
  description?: string;
  assignment_type?: 'practice' | 'quiz' | 'exam' | 'homework';
  due_date?: string;
  total_points?: number;
  is_published?: boolean;
}

export interface AssignToDto {
  classroom_ids?: string[];
  student_ids?: string[];
}

export interface GradeSubmissionDto {
  score: number;
  feedback?: string;
}

/**
 * Assignment Submission Interface
 */
export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  submitted_at?: Date;
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded';
  score?: number;
  feedback?: string;
  graded_at?: Date;
  graded_by?: string;
}

/**
 * Analytics Interfaces
 */
export interface ClassroomAnalytics {
  classroom_id: string;
  classroom_name: string;
  total_students: number;
  active_students: number;
  average_score: number;
  total_assignments: number;
  completion_rate: number;
  students: StudentPerformance[];
}

export interface StudentPerformance {
  student_id: string;
  first_name: string;
  last_name: string;
  email: string;
  total_assignments: number;
  completed_assignments: number;
  average_score: number;
  ml_coins: number;
  rank: string;
  last_activity?: Date;
}

export interface StudentAnalytics {
  student_id: string;
  student_name: string;
  overall_stats: {
    total_exercises: number;
    completed_exercises: number;
    average_score: number;
    total_coins: number;
    current_rank: string;
    streak_days: number;
  };
  module_performance: ModulePerformance[];
  recent_activity: RecentActivity[];
}

export interface ModulePerformance {
  module_id: string;
  module_name: string;
  exercises_attempted: number;
  exercises_completed: number;
  average_score: number;
  time_spent_minutes: number;
}

export interface RecentActivity {
  exercise_id: string;
  exercise_title: string;
  module_name: string;
  score: number;
  completed_at: Date;
  attempts: number;
}

export interface AssignmentAnalytics {
  assignment_id: string;
  assignment_title: string;
  total_assigned: number;
  total_submitted: number;
  total_graded: number;
  average_score: number;
  submission_rate: number;
  submissions: SubmissionDetail[];
}

export interface SubmissionDetail {
  student_id: string;
  student_name: string;
  submitted_at?: Date;
  score?: number;
  status: string;
  time_taken_minutes?: number;
}

export interface EngagementMetrics {
  period: string;
  total_students: number;
  active_students: number;
  engagement_rate: number;
  average_session_duration: number;
  total_exercises_completed: number;
  daily_activity: DailyActivity[];
}

export interface DailyActivity {
  date: string;
  active_students: number;
  exercises_completed: number;
  average_score: number;
}

export interface GenerateReportDto {
  report_type: 'classroom' | 'student' | 'assignment';
  resource_id: string;
  format?: 'json' | 'csv';
  start_date?: string;
  end_date?: string;
}

/**
 * Pagination Query
 */
export interface PaginationQuery {
  page: number;
  limit: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Teacher Notes
 */
export interface TeacherNote {
  id: string;
  teacher_id: string;
  student_id: string;
  note: string;
  is_private: boolean;
  created_at: Date;
}

export interface CreateTeacherNoteDto {
  note: string;
  is_private?: boolean;
}

/**
 * Student Progress Interfaces
 */
export interface StudentProgress {
  studentId: string;
  studentName: string;
  completedExercises: number;
  totalExercises: number;
  averageScore: number;
  totalTimeSpent: number;
  currentStreak: number;
  lastActive: Date;
  strugglingAreas: string[];
}
