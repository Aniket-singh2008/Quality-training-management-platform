export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'agent';
  isActive: boolean;
  status?: string;
  createdAt?: string;
}

export interface Option {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false';
  points: number;
  options: Option[];
}

export interface Agent {
  id: string;
  name: string;
  initial: string;
  colorClass: string;
  team: string;
  role: string;
  score: number; // Quality Score
  qualityScore: number;
  fatalCount: number;
  callAuditCount: number;
  pendingQuizzes: number;
  completedProcesses: number;
  rank: number;
  status: 'Active' | 'On Leave' | 'Inactive';
  email: string;
  agentCode?: string; // e.g. 'AGT001'
}

export type ImportRowStatus = 'Ready to Update' | 'Agent Not Found' | 'Missing Data' | 'Invalid Data';

export interface PerformanceImportRow {
  id: string;
  agentId: string;
  agentName: string;
  matchedAgentId?: string;
  matchedAgentName?: string;
  qualityScore?: number;
  fatalCount?: number;
  callAuditCount?: number;
  status: ImportRowStatus;
  statusReason?: string;
  raw: {
    rawAgentId?: string;
    rawAgentName?: string;
    rawQualityScore?: string;
    rawFatalCount?: string;
    rawCallAuditCount?: string;
  };
  previousValues?: {
    qualityScore: number;
    fatalCount: number;
    callAuditCount: number;
  };
}

export interface ImportSummary {
  totalRecordsFound: number;
  recordsReadyToImport: number;
  successfullyMatchedAgents: number;
  unmatchedAgents: number;
  recordsWithErrors: number;
}

export interface ProcessContent {
  sectionTitle: string;
  bodyText: string;
  complianceCallout?: string;
  attachmentName?: string;
  attachmentSize?: string;
}

export interface AuditProcess {
  id: string;
  draftNumber?: string;
  title: string;
  shortDescription: string;
  category: string;
  effectiveDate: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Published' | 'Draft';
  autoSavedText?: string;
  content: ProcessContent;
  quiz: {
    totalQuestions: number;
    totalMarks: number;
    questions: Question[];
  };
  audience: {
    type: 'all' | 'selected';
    selectedTeams: string[];
    assignedAgents: string[]; // Agent IDs
    totalActive: number;
  };
  metrics?: {
    completionRate: number;
    completedCount: number;
    totalAssigned: number;
    publishedDate?: string;
  };
}

export interface ActivityItem {
  id: string;
  type: 'quiz_completed' | 'team_join' | 'high_score' | 'alert' | 'process_updated';
  userName: string;
  text: string;
  highlight: string;
  scoreBadge?: string;
  timestamp: string;
  actionText?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'alert' | 'success' | 'info';
}

export interface Submission {
  id: string;
  agentId: string;
  agentName: string;
  agentInitial: string;
  agentColor: string;
  team: string;
  processId: string;
  processTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  submittedAt: string;
  answersSummary?: { correct: number; total: number };
  answersDetail?: Array<{
    questionId: string;
    questionText: string;
    selectedOptionId: string;
    selectedOptionText: string;
    correctOptionText: string;
    isCorrect: boolean;
    pointsEarned: number;
    pointsPossible: number;
  }>;
}

export interface SystemSettings {
  orgName: string;
  passThreshold: number;
  sev1SlaMinutes: number;
  autoAssignNewHires: boolean;
  dailyQuizReminders: boolean;
  emailAlerts: boolean;
  accentTheme: 'indigo' | 'violet' | 'cyan';
}

