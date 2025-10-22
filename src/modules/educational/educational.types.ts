/**
 * Educational Module Types
 *
 * Comprehensive TypeScript interfaces for educational content management,
 * progress tracking, and the 27 exercise mechanics.
 *
 * @module educational.types
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Exercise Types - All 27 Mechanics
 */
export enum ExerciseType {
  // Module 1 - Comprensión Literal (5)
  CRUCIGRAMA = 'crucigrama',
  LINEA_TIEMPO = 'linea_tiempo',
  SOPA_LETRAS = 'sopa_letras',
  MAPA_CONCEPTUAL = 'mapa_conceptual',
  EMPAREJAMIENTO = 'emparejamiento',

  // Module 2 - Comprensión Inferencial (5)
  DETECTIVE_TEXTUAL = 'detective_textual',
  CONSTRUCCION_HIPOTESIS = 'construccion_hipotesis',
  PREDICCION_NARRATIVA = 'prediccion_narrativa',
  PUZZLE_CONTEXTO = 'puzzle_contexto',
  RUEDA_INFERENCIAS = 'rueda_inferencias',

  // Module 3 - Comprensión Crítica (5)
  TRIBUNAL_OPINIONES = 'tribunal_opiniones',
  DEBATE_DIGITAL = 'debate_digital',
  ANALISIS_FUENTES = 'analisis_fuentes',
  PODCAST_ARGUMENTATIVO = 'podcast_argumentativo',
  MATRIZ_PERSPECTIVAS = 'matriz_perspectivas',

  // Module 4 - Lectura Digital (5)
  VERIFICADOR_FAKE_NEWS = 'verificador_fake_news',
  INFOGRAFIA_INTERACTIVA = 'infografia_interactiva',
  QUIZ_TIKTOK = 'quiz_tiktok',
  NAVEGACION_HIPERTEXTUAL = 'navegacion_hipertextual',
  ANALISIS_MEMES = 'analisis_memes',

  // Module 5 - Producción Lectora (3)
  DIARIO_MULTIMEDIA = 'diario_multimedia',
  COMIC_DIGITAL = 'comic_digital',
  VIDEO_CARTA = 'video_carta',

  // Auxiliares (8)
  COMPRENSION_AUDITIVA = 'comprension_auditiva',
  COLLAGE_PRENSA = 'collage_prensa',
  TEXTO_MOVIMIENTO = 'texto_movimiento',
  CALL_TO_ACTION = 'call_to_action',
  VERDADERO_FALSO = 'verdadero_falso',
  COMPLETAR_ESPACIOS = 'completar_espacios',
  DIARIO_INTERACTIVO = 'diario_interactivo',
  RESUMEN_VISUAL = 'resumen_visual'
}

export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  REVIEWED = 'reviewed',
  MASTERED = 'mastered'
}

export enum ContentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum RangoMaya {
  NACOM = 'nacom',
  BATAB = 'batab',
  HOLCATTE = 'holcatte',
  GUERRERO = 'guerrero',
  MERCENARIO = 'mercenario'
}

export enum ComodinType {
  PISTAS = 'pistas',
  VISION_LECTORA = 'vision_lectora',
  SEGUNDA_OPORTUNIDAD = 'segunda_oportunidad'
}

// ============================================================================
// MODULE INTERFACES
// ============================================================================

/**
 * Module DTO for creation
 */
export interface CreateModuleDto {
  title: string;
  subtitle?: string;
  description: string;
  summary?: string;
  orderIndex: number;
  difficulty: DifficultyLevel;
  estimatedDurationMinutes?: number;
  learningObjectives?: string[];
  rangoMayaRequired?: RangoMaya;
  rangoMayaGranted?: RangoMaya;
  xpReward?: number;
  mlCoinsReward?: number;
  thumbnailUrl?: string;
  tags?: string[];
}

/**
 * Module Response
 */
export interface ModuleResponse {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  orderIndex: number;
  difficulty: DifficultyLevel;
  estimatedDurationMinutes: number;
  totalExercises: number;
  thumbnailUrl?: string;
  rangoMayaRequired?: RangoMaya;
  rangoMayaGranted?: RangoMaya;
  xpReward: number;
  mlCoinsReward: number;
  isPublished: boolean;
  learningObjectives?: string[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Module Detail Response (with exercises)
 */
export interface ModuleDetailResponse extends ModuleResponse {
  longDescription?: string;
  objectives?: string[];
  prerequisites?: string[];
  exercises: ExerciseSummary[];
  completedExercises: number;
  progressPercentage: number;
}

// ============================================================================
// EXERCISE INTERFACES
// ============================================================================

/**
 * Exercise Summary
 */
export interface ExerciseSummary {
  id: string;
  title: string;
  exerciseType: ExerciseType;
  orderIndex: number;
  difficulty: DifficultyLevel;
  estimatedTimeMinutes: number;
  pointsReward: number;
  isUnlocked: boolean;
}

/**
 * Create Exercise DTO
 */
export interface CreateExerciseDto {
  moduleId: string;
  title: string;
  description: string;
  instructions: string;
  exerciseType: ExerciseType;
  orderIndex: number;
  config: Record<string, any>;
  content: ExerciseContent;
  solution?: Record<string, any>;
  rubric?: Record<string, any>;
  autoGradable?: boolean;
  difficulty: DifficultyLevel;
  maxPoints?: number;
  passingScore?: number;
  estimatedTimeMinutes?: number;
  timeLimitMinutes?: number;
  maxAttempts?: number;
  hints?: string[];
  comodinesAllowed?: ComodinType[];
  xpReward?: number;
  mlCoinsReward?: number;
}

/**
 * Exercise Content (base structure)
 */
export interface ExerciseContent {
  question?: string;
  options?: any[];
  correctAnswers?: any[];
  explanations?: Record<string, string>;
  marieCurieContext?: Record<string, any>;
  resources?: any[];
  [key: string]: any; // Type-specific fields
}

/**
 * Exercise Response
 */
export interface ExerciseResponse {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  instructions: string;
  exerciseType: ExerciseType;
  difficulty: DifficultyLevel;
  difficultyLevel?: DifficultyLevel; // Alias for difficulty
  estimatedTimeMinutes: number;
  pointsReward: number;
  passingScore: number; // Minimum score required to pass
  mlCoinsReward: number;
  xpReward: number;
  content: ExerciseContent;
  hints?: string[];
  availablePowerups: ComodinType[];
  userProgress?: {
    attempts: number;
    bestScore: number;
    completed: boolean;
    lastAttemptedAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// EXERCISE CONTENT TYPE-SPECIFIC INTERFACES
// ============================================================================

/**
 * Crucigrama Científico Content
 */
export interface CrucigramaContent extends ExerciseContent {
  grid: {
    rows: number;
    cols: number;
    cells: Array<{
      row: number;
      col: number;
      value: string;
      isBlack: boolean;
      number?: number;
    }>;
  };
  clues: {
    across: Array<{ number: number; clue: string; answer: string }>;
    down: Array<{ number: number; clue: string; answer: string }>;
  };
}

/**
 * Línea de Tiempo Content
 */
export interface LineaTiempoContent extends ExerciseContent {
  events: Array<{
    id: string;
    title: string;
    date: string;
    year: number;
    description: string;
    imageUrl?: string;
    correctPosition: number;
  }>;
  timelineRange: {
    startYear: number;
    endYear: number;
  };
}

/**
 * Detective Textual Content
 */
export interface DetectiveTextualContent extends ExerciseContent {
  text: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'multiple_choice' | 'true_false' | 'short_answer' | 'inference';
    options?: string[];
    correctAnswer: string | string[];
    explanation: string;
    evidenceLocation?: {
      startIndex: number;
      endIndex: number;
    };
  }>;
  cluesAvailable: string[];
}

/**
 * Mapa Conceptual Content
 */
export interface MapaConceptualContent extends ExerciseContent {
  concepts: Array<{
    id: string;
    text: string;
    level: number;
    position?: { x: number; y: number };
  }>;
  relationships: Array<{
    id: string;
    fromConceptId: string;
    toConceptId: string;
    label: string;
    type: 'is-a' | 'has-a' | 'part-of' | 'causes' | 'leads-to';
  }>;
  mainConcept: string;
}

/**
 * Debate Digital Content
 */
export interface DebateDigitalContent extends ExerciseContent {
  topic: string;
  stance: 'pro' | 'contra';
  aiOpponentLevel: 'beginner' | 'intermediate' | 'advanced';
  timeLimit: number; // seconds per turn
  minArguments: number;
  evaluationCriteria: {
    clarity: number;
    evidence: number;
    logic: number;
    persuasion: number;
  };
  backgroundInfo: string[];
  suggestedArguments?: string[];
}

/**
 * Verificador Fake News Content
 */
export interface VerificadorFakeNewsContent extends ExerciseContent {
  article: {
    title: string;
    content: string;
    source: string;
    publishDate: string;
    imageUrl?: string;
  };
  claims: Array<{
    id: string;
    claim: string;
    isVerified: boolean;
    veracity: 'true' | 'false' | 'misleading' | 'unverifiable';
    sources: string[];
    explanation: string;
  }>;
  checklistCriteria: string[];
}

/**
 * Quiz TikTok Content
 */
export interface QuizTikTokContent extends ExerciseContent {
  questions: Array<{
    id: string;
    videoUrl?: string;
    imageUrl?: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    funFact?: string;
  }>;
  swipeDirection: 'vertical' | 'horizontal';
  autoAdvance: boolean;
  timePerQuestion: number;
}

/**
 * Podcast Argumentativo Content
 */
export interface PodcastArgumentativoContent extends ExerciseContent {
  topic: string;
  script: {
    intro: string;
    mainPoints: string[];
    conclusion: string;
  };
  minDuration: number; // seconds
  maxDuration: number;
  evaluationCriteria: {
    contentQuality: number;
    audioQuality: number;
    argumentation: number;
    engagement: number;
  };
  exampleScripts?: string[];
}

/**
 * Diario Multimedia Content
 */
export interface DiarioMultimediaContent extends ExerciseContent {
  prompts: string[];
  minEntries: number;
  allowedMediaTypes: ('text' | 'image' | 'video' | 'audio')[];
  evaluationCriteria: {
    reflection: number;
    creativity: number;
    multimedia: number;
    consistency: number;
  };
}

/**
 * Cómic Digital Content
 */
export interface ComicDigitalContent extends ExerciseContent {
  theme: string;
  minPanels: number;
  maxPanels: number;
  characterLibrary: Array<{
    id: string;
    name: string;
    imageUrl: string;
  }>;
  backgroundLibrary: Array<{
    id: string;
    name: string;
    imageUrl: string;
  }>;
  evaluationCriteria: {
    narrative: number;
    visualComposition: number;
    creativity: number;
    coherence: number;
  };
}

// ============================================================================
// SUBMISSION INTERFACES
// ============================================================================

/**
 * Submit Exercise DTO
 */
export interface SubmitExerciseDto {
  userId: string;
  exerciseId: string;
  answers: any; // Exercise-specific answer format
  timeSpent: number; // seconds
  powerupsUsed: ComodinType[];
  sessionId?: string;
}

/**
 * Exercise Submission Response
 */
export interface SubmissionResponse {
  attemptId: string;
  score: number;
  isPerfect: boolean;
  correctAnswers: number;
  totalQuestions: number;
  rewards: {
    mlCoins: number;
    xp: number;
    bonuses: {
      perfectScore?: number;
      noHints?: number;
      speedBonus?: number;
      firstAttempt?: number;
    };
  };
  feedback: {
    overall: string;
    answerReview: Array<{
      questionId: string;
      isCorrect: boolean;
      userAnswer: string;
      correctAnswer: string;
      explanation?: string;
    }>;
  };
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    rarity: string;
  }>;
  rankUp?: {
    newRank: string;
    previousRank?: string;
    bonusMLCoins: number;
    newMultiplier: number;
  } | null;
  createdAt: Date;
}

// ============================================================================
// PROGRESS TRACKING INTERFACES
// ============================================================================

/**
 * User Progress Overview
 */
export interface UserProgressOverview {
  userId: string;
  overallProgress: {
    totalModules: number;
    completedModules: number;
    totalExercises: number;
    completedExercises: number;
    overallPercentage: number;
  };
  moduleProgress: ModuleProgressSummary[];
  recentActivity: Activity[];
  studyStreak: {
    currentStreak: number;
    longestStreak: number;
    lastStudyDate: Date;
  };
}

/**
 * Module Progress Summary
 */
export interface ModuleProgressSummary {
  moduleId: string;
  moduleName: string;
  totalExercises: number;
  completedExercises: number;
  progressPercentage: number;
  averageScore: number;
  timeSpent: number; // minutes
  lastActivityAt: Date;
}

/**
 * Module Progress Detail
 */
export interface ModuleProgressDetail {
  userId: string;
  moduleId: string;
  startedAt: Date;
  completedAt?: Date;
  progressPercentage: number;
  totalExercises: number;
  completedExercises: number;
  averageScore: number;
  totalTimeSpent: number;
  exerciseProgress: Array<{
    exerciseId: string;
    exerciseTitle: string;
    attempts: number;
    bestScore: number;
    averageScore: number;
    completed: boolean;
    perfectScore: boolean;
    timeSpent: number;
    lastAttemptedAt: Date;
  }>;
  strengths: string[];
  weaknesses: string[];
  updatedAt: Date;
}

/**
 * Exercise Attempt
 */
export interface ExerciseAttempt {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  timeSpent: number;
  hintsUsed: number;
  powerupsUsed: ComodinType[];
  answers: any;
  feedback: any;
  isPerfect: boolean;
  mlCoinsEarned: number;
  xpEarned: number;
  attemptNumber: number;
  startedAt: Date;
  completedAt: Date;
}

/**
 * Learning Analytics
 */
export interface LearningAnalytics {
  timeframe: string;
  summary: {
    totalTimeStudied: number; // minutes
    exercisesCompleted: number;
    averageScore: number;
    perfectScores: number;
    improvementRate: number; // percentage
  };
  performanceByModule: Array<{
    moduleId: string;
    moduleName: string;
    averageScore: number;
    exercisesCompleted: number;
    timeSpent: number;
    improvement: number;
  }>;
  performanceByType: Array<{
    exerciseType: ExerciseType;
    averageScore: number;
    totalAttempts: number;
    successRate: number;
  }>;
  studyPattern: {
    averageSessionDuration: number;
    preferredStudyTime: string;
    mostActiveDay: string;
    studyConsistency: number;
  };
  trends: {
    scoreOverTime: Array<{ date: string; averageScore: number }>;
    activityOverTime: Array<{ date: string; exercisesCompleted: number; minutesStudied: number }>;
  };
}

/**
 * Activity
 */
export interface Activity {
  type: 'exercise_completed' | 'achievement_unlocked' | 'rank_advanced' | 'module_completed';
  description: string;
  timestamp: Date;
  metadata: any;
}

/**
 * Learning Session
 */
export interface LearningSession {
  sessionId: string;
  userId: string;
  moduleId?: string;
  startedAt: Date;
  endedAt?: Date;
  duration?: number;
  exercisesCompleted: number;
  mlCoinsEarned: number;
  xpEarned: number;
  goals?: string[];
}

// ============================================================================
// ANALYTICS INTERFACES
// ============================================================================

/**
 * Student Dashboard Data
 */
export interface StudentDashboard {
  currentModule?: ModuleResponse;
  recentActivities: Activity[];
  upcomingExercises: ExerciseSummary[];
  progressCharts: {
    moduleProgress: Array<{ moduleId: string; percentage: number }>;
    scoresTrend: Array<{ date: string; score: number }>;
    timeSpent: Array<{ date: string; minutes: number }>;
  };
  stats: {
    mlCoins: number;
    totalXP: number;
    currentRank: RangoMaya;
    streakDays: number;
    exercisesCompleted: number;
    averageScore: number;
  };
}

/**
 * Classroom Analytics
 */
export interface ClassroomAnalytics {
  classroomId: string;
  timeframe: string;
  summary: {
    totalStudents: number;
    activeStudents: number;
    averageProgress: number;
    averageScore: number;
    totalExercisesCompleted: number;
  };
  topPerformers: Array<{
    userId: string;
    displayName: string;
    totalXP: number;
    currentRank: RangoMaya;
    exercisesCompleted: number;
  }>;
  strugglingStudents: Array<{
    userId: string;
    displayName: string;
    averageScore: number;
    failedAttempts: number;
    lastActiveAt: Date;
  }>;
  modulePerformance: Array<{
    moduleId: string;
    moduleName: string;
    completionRate: number;
    averageScore: number;
    averageTimeSpent: number;
  }>;
  commonMistakes: Array<{
    exerciseId: string;
    exerciseTitle: string;
    errorRate: number;
    commonErrors: string[];
  }>;
}

// ============================================================================
// SCORING INTERFACES
// ============================================================================

/**
 * Scoring Configuration
 */
export interface ScoringConfig {
  basePoints: number;
  difficultyMultiplier: number;
  rankMultiplier: number;
  streakBonus: number;
  powerupPenalty: number;
  timeBonus?: number;
}

/**
 * Score Calculation Result
 */
export interface ScoreResult {
  rawScore: number;
  finalScore: number;
  multipliers: {
    difficulty: number;
    rank: number;
    streak: number;
  };
  bonuses: {
    perfect?: number;
    speed?: number;
    noHints?: number;
    firstAttempt?: number;
  };
  penalties: {
    powerups?: number;
    timeOverage?: number;
  };
  mlCoins: number;
  xp: number;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Pagination Query
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * Filter Options
 */
export interface FilterOptions {
  moduleId?: string;
  type?: ExerciseType;
  difficulty?: DifficultyLevel;
  startDate?: string;
  endDate?: string;
}
