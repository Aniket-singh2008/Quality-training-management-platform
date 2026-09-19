import { AuditProcess, Agent, ActivityItem, NotificationItem } from '../types';

export const LOGO_URL = "https://lh3.googleusercontent.com/aida/AEtjO1VgTOuIeAM7SPu-uLKHO7kEhkHEitxQ4exzrSvoPDRlwFAW5vTHI4l7u4qB7qj-BMMEYKYzGG6vk8L0HtbMjX7JpB1n7FKvkrPTuMjPZ1Ns6Y6FE5sjjLZ0B9edpBOn3ySV3xOPKawedX6IWuSTS2SL_DjGCAmg5_0SXSgsNraFE7uO3d7gunlPYbG_FJsdmdmKXuuM2qnDPeT25s2ITzF14mMjZ39HhVbxvlsktVr-HSvSWARYbaYpCu11";
export const PROFILE_AVATAR_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCWWij44s7K0qzxVRXFMn2rv8J7fzL8vIkuOI6Q0ThlZeNjDJnIXxFgSOAv13_WSKyLOB5UvtlAepuJTQRQxHFjoIdukYn8OZ7ah1ryxU4jGHHe8AfprceTn9ca729jzpKuKGF52CiSTL7rX-ErULZv1j0Fp_2f2K5hsti93D61NfrM_i7CUtTDL1OF6hjU_Y3S1s_DAvxGqpapgdAq4nqVJraM62C_43h9T1XV-R7ch6cnOogni7L46w";

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'ag-6',
    agentCode: 'AGT006',
    name: 'Neha Kapoor',
    initial: 'N',
    colorClass: 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-900',
    team: 'Customer Success',
    role: 'Relationship Manager',
    score: 96,
    qualityScore: 96,
    fatalCount: 0,
    callAuditCount: 42,
    pendingQuizzes: 0,
    completedProcesses: 8,
    rank: 1,
    status: 'Active',
    email: 'neha.kapoor@processhub.internal'
  },
  {
    id: 'ag-3',
    agentCode: 'AGT003',
    name: 'Aman Verma',
    initial: 'A',
    colorClass: 'bg-gradient-to-tr from-slate-300 to-slate-400 text-slate-900',
    team: 'Escalations Squad',
    role: 'Tier-2 Triage Lead',
    score: 95,
    qualityScore: 95,
    fatalCount: 0,
    callAuditCount: 38,
    pendingQuizzes: 0,
    completedProcesses: 8,
    rank: 2,
    status: 'Active',
    email: 'aman.verma@processhub.internal'
  },
  {
    id: 'ag-1',
    agentCode: 'AGT001',
    name: 'Rahul Mehta',
    initial: 'R',
    colorClass: 'bg-gradient-to-tr from-amber-700 to-amber-800 text-amber-100',
    team: 'Escalations Squad',
    role: 'Senior QA Specialist',
    score: 92,
    qualityScore: 92,
    fatalCount: 0,
    callAuditCount: 35,
    pendingQuizzes: 0,
    completedProcesses: 7,
    rank: 3,
    status: 'Active',
    email: 'rahul.mehta@processhub.internal'
  },
  {
    id: 'ag-7',
    agentCode: 'AGT007',
    name: 'Karan Nair',
    initial: 'K',
    colorClass: 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white',
    team: 'Escalations Squad',
    role: 'Technical Incident Analyst',
    score: 91,
    qualityScore: 91,
    fatalCount: 1,
    callAuditCount: 30,
    pendingQuizzes: 0,
    completedProcesses: 7,
    rank: 4,
    status: 'Active',
    email: 'karan.nair@processhub.internal'
  },
  {
    id: 'ag-2',
    agentCode: 'AGT002',
    name: 'Priya Patel',
    initial: 'P',
    colorClass: 'bg-gradient-to-tr from-emerald-500 to-teal-600 text-white',
    team: 'Customer Success',
    role: 'Operations Associate',
    score: 89,
    qualityScore: 89,
    fatalCount: 1,
    callAuditCount: 28,
    pendingQuizzes: 1,
    completedProcesses: 6,
    rank: 5,
    status: 'Active',
    email: 'priya.patel@processhub.internal'
  },
  {
    id: 'ag-5',
    agentCode: 'AGT005',
    name: 'Vikram Joshi',
    initial: 'V',
    colorClass: 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white',
    team: 'Billing Ops',
    role: 'Billing Dispute Analyst',
    score: 88,
    qualityScore: 88,
    fatalCount: 2,
    callAuditCount: 25,
    pendingQuizzes: 1,
    completedProcesses: 6,
    rank: 6,
    status: 'Active',
    email: 'vikram.joshi@processhub.internal'
  },
  {
    id: 'ag-4',
    agentCode: 'AGT004',
    name: 'Sneha Rao',
    initial: 'S',
    colorClass: 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white',
    team: 'Tier 1 Support',
    role: 'Support Specialist',
    score: 84,
    qualityScore: 84,
    fatalCount: 2,
    callAuditCount: 22,
    pendingQuizzes: 1,
    completedProcesses: 5,
    rank: 7,
    status: 'Active',
    email: 'sneha.rao@processhub.internal'
  },
  {
    id: 'ag-8',
    agentCode: 'AGT008',
    name: 'Tanvi Shah',
    initial: 'T',
    colorClass: 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white',
    team: 'Tier 1 Support',
    role: 'Support Specialist',
    score: 82,
    qualityScore: 82,
    fatalCount: 3,
    callAuditCount: 20,
    pendingQuizzes: 2,
    completedProcesses: 4,
    rank: 8,
    status: 'Active',
    email: 'tanvi.shah@processhub.internal'
  }
];

export const INITIAL_PROCESSES: AuditProcess[] = [
  {
    id: 'proc-1',
    draftNumber: 'Draft #PU-2024-09',
    title: 'Tier 2 Escalation & Incident Triage Protocol',
    shortDescription: 'Guidelines for handling priority customer tickets and edge cases requiring manager override.',
    category: 'Support / Escalations',
    effectiveDate: 'Nov 01, 2024',
    priority: 'High',
    status: 'Draft',
    autoSavedText: 'Auto-saved 2m ago',
    content: {
      sectionTitle: 'Incident Classification Criteria',
      bodyText: 'When a customer reports payment discrepancy > $500, immediately flag the ticket under Severity-1 and trigger the direct tier-2 routing chain.',
      complianceCallout: 'Ensure all customer identifiers are masked prior to initiating third-party audit verification.',
      attachmentName: 'escalation_matrix_v2.pdf',
      attachmentSize: '1.4 MB'
    },
    quiz: {
      totalQuestions: 2,
      totalMarks: 20,
      questions: [
        {
          id: 'q-1',
          text: 'What is the mandatory SLA response time for a Severity-1 payment escalation?',
          type: 'multiple-choice',
          points: 10,
          options: [
            { id: 'opt-1', text: '15 minutes', isCorrect: true },
            { id: 'opt-2', text: '30 minutes', isCorrect: false },
            { id: 'opt-3', text: '1 hour', isCorrect: false },
            { id: 'opt-4', text: '4 hours', isCorrect: false }
          ]
        },
        {
          id: 'q-2',
          text: 'Which step is mandatory before escalating payment discrepancies over $500 to third-party verification?',
          type: 'multiple-choice',
          points: 10,
          options: [
            { id: 'opt-2-1', text: 'Mask all personally identifiable information (PII)', isCorrect: true },
            { id: 'opt-2-2', text: 'Issue an immediate non-refundable credit voucher', isCorrect: false },
            { id: 'opt-2-3', text: 'Close customer ticket as resolved', isCorrect: false },
            { id: 'opt-2-4', text: 'Forward unredacted account numbers directly', isCorrect: false }
          ]
        }
      ]
    },
    audience: {
      type: 'selected',
      selectedTeams: ['Escalations Squad'],
      assignedAgents: ['ag-1', 'ag-2', 'ag-3', 'ag-4', 'ag-5', 'ag-6', 'ag-7', 'ag-8'],
      totalActive: 24
    },
    metrics: {
      completionRate: 0,
      completedCount: 0,
      totalAssigned: 24,
      publishedDate: 'Draft'
    }
  },
  {
    id: 'proc-2',
    title: 'Customer Verification Process',
    shortDescription: 'Multi-factor and credential verification protocol before account reset procedures.',
    category: 'Customer Success',
    effectiveDate: 'Oct 22, 2024',
    priority: 'High',
    status: 'Published',
    content: {
      sectionTitle: 'Mandatory Identity Checks',
      bodyText: 'Verify 2 primary data attributes and 1 recent transaction verification code before modifying email or billing records.',
      complianceCallout: 'Any unverified identity breach must be reported within 10 minutes to Security Ops.'
    },
    quiz: {
      totalQuestions: 5,
      totalMarks: 50,
      questions: [
        {
          id: 'q-cv-1',
          text: 'How many primary verification data points are required before modifying account records?',
          type: 'multiple-choice',
          points: 10,
          options: [
            { id: 'o-1', text: '1 point', isCorrect: false },
            { id: 'o-2', text: '2 primary attributes + 1 recent code', isCorrect: true },
            { id: 'o-3', text: 'Oral confirmation only', isCorrect: false }
          ]
        }
      ]
    },
    audience: {
      type: 'all',
      selectedTeams: ['Escalations Squad', 'Customer Success', 'Tier 1 Support'],
      assignedAgents: ['ag-1', 'ag-2', 'ag-3', 'ag-4', 'ag-5', 'ag-6', 'ag-7', 'ag-8'],
      totalActive: 24
    },
    metrics: {
      completionRate: 88,
      completedCount: 21,
      totalAssigned: 24,
      publishedDate: 'Oct 22'
    }
  },
  {
    id: 'proc-3',
    title: 'Escalation Handling Update',
    shortDescription: 'Revamped triage matrices for critical system downtime and merchant gateway disruptions.',
    category: 'Support / Escalations',
    effectiveDate: 'Oct 19, 2024',
    priority: 'High',
    status: 'Published',
    content: {
      sectionTitle: 'Gateway Error Classifications',
      bodyText: 'Class 502/504 gateway failures require immediate war-room dispatch if sustained for > 90 seconds.',
      complianceCallout: 'Keep status page synced every 15 minutes during active Sev-1 triage.'
    },
    quiz: {
      totalQuestions: 8,
      totalMarks: 80,
      questions: [
        {
          id: 'q-eh-1',
          text: 'What duration of gateway 502 error triggers an automatic war-room dispatch?',
          type: 'multiple-choice',
          points: 10,
          options: [
            { id: 'o-eh-1', text: 'Greater than 90 seconds', isCorrect: true },
            { id: 'o-eh-2', text: '10 minutes', isCorrect: false },
            { id: 'o-eh-3', text: '30 minutes', isCorrect: false }
          ]
        }
      ]
    },
    audience: {
      type: 'all',
      selectedTeams: ['Escalations Squad', 'Tier 1 Support'],
      assignedAgents: ['ag-1', 'ag-3', 'ag-7'],
      totalActive: 24
    },
    metrics: {
      completionRate: 62,
      completedCount: 15,
      totalAssigned: 24,
      publishedDate: 'Oct 19'
    }
  },
  {
    id: 'proc-4',
    title: 'Refund Policy Update',
    shortDescription: 'Autonomous refund approval limits and dispute threshold updates for Q4.',
    category: 'Billing Ops',
    effectiveDate: 'Oct 15, 2024',
    priority: 'Medium',
    status: 'Published',
    content: {
      sectionTitle: 'Autonomous Refund Ceiling',
      bodyText: 'Agents are empowered to authorize immediate courtesy refunds up to $150 for platinum accounts.',
      complianceCallout: 'All discretionary credits over $100 are reviewed by Weekly QA sample audit.'
    },
    quiz: {
      totalQuestions: 6,
      totalMarks: 60,
      questions: [
        {
          id: 'q-rf-1',
          text: 'What is the maximum autonomous refund amount for platinum tier customers without manager approval?',
          type: 'multiple-choice',
          points: 10,
          options: [
            { id: 'o-rf-1', text: '$150', isCorrect: true },
            { id: 'o-rf-2', text: '$50', isCorrect: false },
            { id: 'o-rf-3', text: '$500', isCorrect: false }
          ]
        }
      ]
    },
    audience: {
      type: 'all',
      selectedTeams: ['Billing Ops', 'Customer Success'],
      assignedAgents: ['ag-1', 'ag-2', 'ag-5'],
      totalActive: 24
    },
    metrics: {
      completionRate: 100,
      completedCount: 24,
      totalAssigned: 24,
      publishedDate: 'Oct 15'
    }
  },
  {
    id: 'proc-5',
    title: 'New Call Quality Guidelines',
    shortDescription: 'Speech cadence, empathy markers, and mandatory QA compliance phrases.',
    category: 'Customer Success',
    effectiveDate: 'Oct 24, 2024',
    priority: 'Medium',
    status: 'Draft',
    content: {
      sectionTitle: 'Empathy & De-escalation Scripts',
      bodyText: 'Adopt active listening frameworks. Never interrupt a customer during the initial 45 seconds of dispute statement.',
      complianceCallout: 'Mandatory recorded disclaimer must be spoken verbatim before taking payment information.'
    },
    quiz: {
      totalQuestions: 10,
      totalMarks: 100,
      questions: [
        {
          id: 'q-cq-1',
          text: 'How long should an agent actively listen without interrupting during dispute presentation?',
          type: 'multiple-choice',
          points: 10,
          options: [
            { id: 'o-cq-1', text: 'At least 45 seconds', isCorrect: true },
            { id: 'o-cq-2', text: '10 seconds', isCorrect: false }
          ]
        }
      ]
    },
    audience: {
      type: 'selected',
      selectedTeams: ['Tier 1 Support', 'Customer Success'],
      assignedAgents: ['ag-2', 'ag-4', 'ag-6', 'ag-8'],
      totalActive: 24
    },
    metrics: {
      completionRate: 0,
      completedCount: 0,
      totalAssigned: 0,
      publishedDate: 'Created: Oct 24'
    }
  },
  {
    id: 'proc-6',
    title: 'GDPR & PII Data Handling Mandate',
    shortDescription: 'Strict masking rules for payment data, personal addresses, and customer phone logs.',
    category: 'Compliance / Legal',
    effectiveDate: 'Oct 10, 2024',
    priority: 'High',
    status: 'Published',
    content: {
      sectionTitle: 'PII Redaction Rules',
      bodyText: 'Credit card numbers must display only the final 4 digits. Social numbers must never be entered in ticket notes.',
      complianceCallout: 'Zero tolerance for PII leaks into unencrypted chat channels.'
    },
    quiz: {
      totalQuestions: 4,
      totalMarks: 40,
      questions: [
        {
          id: 'q-gdpr-1',
          text: 'Are agents permitted to paste unmasked card numbers in internal Slack channels?',
          type: 'true-false',
          points: 10,
          options: [
            { id: 'o-t', text: 'True', isCorrect: false },
            { id: 'o-f', text: 'False - Strictly Prohibited', isCorrect: true }
          ]
        }
      ]
    },
    audience: {
      type: 'all',
      selectedTeams: ['Escalations Squad', 'Customer Success', 'Billing Ops', 'Tier 1 Support'],
      assignedAgents: ['ag-1', 'ag-2', 'ag-3', 'ag-4', 'ag-5', 'ag-6', 'ag-7', 'ag-8'],
      totalActive: 24
    },
    metrics: {
      completionRate: 96,
      completedCount: 23,
      totalAssigned: 24,
      publishedDate: 'Oct 10'
    }
  }
];

export const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'act-1',
    type: 'quiz_completed',
    userName: 'Rahul Mehta',
    text: 'completed',
    highlight: 'Refund Policy Quiz',
    scoreBadge: 'Score: 92%',
    timestamp: '5m ago'
  },
  {
    id: 'act-2',
    type: 'team_join',
    userName: 'Priya Patel',
    text: 'joined the team • Assigned',
    highlight: 'Customer Verification',
    timestamp: '1h ago'
  },
  {
    id: 'act-3',
    type: 'high_score',
    userName: 'Aman Verma',
    text: 'scored 95% on',
    highlight: 'Escalation Handling Update',
    scoreBadge: 'Top 5%',
    timestamp: '3h ago'
  },
  {
    id: 'act-4',
    type: 'alert',
    userName: 'System alert:',
    text: '3 agents pending Customer Verification quiz',
    highlight: '',
    actionText: 'Action recommended',
    timestamp: '5h ago'
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Quiz SLA Warning',
    message: '3 agents have Customer Verification quiz due within 2 hours.',
    time: '15m ago',
    read: false,
    type: 'alert'
  },
  {
    id: 'n-2',
    title: 'Audit Complete',
    message: 'Refund Policy Update reached 100% completion across all squads.',
    time: '2h ago',
    read: false,
    type: 'success'
  },
  {
    id: 'n-3',
    title: 'Calibration Check',
    message: 'Weekly team score calibration increased by +3.2% to 87%.',
    time: '1d ago',
    read: true,
    type: 'info'
  }
];

export const INITIAL_SUBMISSIONS = [
  {
    id: 'sub-1',
    agentId: 'ag-1',
    agentName: 'Rahul Mehta',
    agentInitial: 'R',
    agentColor: 'bg-gradient-to-tr from-amber-700 to-amber-800 text-amber-100',
    team: 'Escalations Squad',
    processId: 'proc-4',
    processTitle: 'Refund Policy Update',
    score: 60,
    totalMarks: 60,
    percentage: 100,
    passed: true,
    submittedAt: '5m ago',
    answersSummary: { correct: 6, total: 6 }
  },
  {
    id: 'sub-2',
    agentId: 'ag-3',
    agentName: 'Aman Verma',
    agentInitial: 'A',
    agentColor: 'bg-gradient-to-tr from-slate-300 to-slate-400 text-slate-900',
    team: 'Escalations Squad',
    processId: 'proc-3',
    processTitle: 'Escalation Handling Update',
    score: 76,
    totalMarks: 80,
    percentage: 95,
    passed: true,
    submittedAt: '3h ago',
    answersSummary: { correct: 8, total: 8 }
  },
  {
    id: 'sub-3',
    agentId: 'ag-6',
    agentName: 'Neha Kapoor',
    agentInitial: 'N',
    agentColor: 'bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-900',
    team: 'Customer Success',
    processId: 'proc-2',
    processTitle: 'Customer Verification Process',
    score: 50,
    totalMarks: 50,
    percentage: 100,
    passed: true,
    submittedAt: '5h ago',
    answersSummary: { correct: 5, total: 5 }
  },
  {
    id: 'sub-4',
    agentId: 'ag-5',
    agentName: 'Vikram Joshi',
    agentInitial: 'V',
    agentColor: 'bg-gradient-to-tr from-purple-500 to-indigo-600 text-white',
    team: 'Billing Ops',
    processId: 'proc-4',
    processTitle: 'Refund Policy Update',
    score: 50,
    totalMarks: 60,
    percentage: 83,
    passed: true,
    submittedAt: '1d ago',
    answersSummary: { correct: 5, total: 6 }
  },
  {
    id: 'sub-5',
    agentId: 'ag-4',
    agentName: 'Sneha Rao',
    agentInitial: 'S',
    agentColor: 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white',
    team: 'Tier 1 Support',
    processId: 'proc-6',
    processTitle: 'GDPR & PII Data Handling Mandate',
    score: 40,
    totalMarks: 40,
    percentage: 100,
    passed: true,
    submittedAt: '2d ago',
    answersSummary: { correct: 4, total: 4 }
  }
];

export const INITIAL_SETTINGS = {
  orgName: 'ProcessHub Global Operations',
  passThreshold: 80,
  sev1SlaMinutes: 15,
  autoAssignNewHires: true,
  dailyQuizReminders: true,
  emailAlerts: true,
  accentTheme: 'indigo' as const
};

