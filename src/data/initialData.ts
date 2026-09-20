import { AuditProcess, Agent, ActivityItem, NotificationItem, Submission } from '../types';

export const LOGO_URL = "https://lh3.googleusercontent.com/aida/AEtjO1VgTOuIeAM7SPu-uLKHO7kEhkHEitxQ4exzrSvoPDRlwFAW5vTHI4l7u4qB7qj-BMMEYKYzGG6vk8L0HtbMjX7JpB1n7FKvkrPTuMjPZ1Ns6Y6FE5sjjLZ0B9edpBOn3ySV3xOPKawedX6IWuSTS2SL_DjGCAmg5_0SXSgsNraFE7uO3d7gunlPYbG_FJsdmdmKXuuM2qnDPeT25s2ITzF14mMjZ39HhVbxvlsktVr-HSvSWARYbaYpCu11";
export const PROFILE_AVATAR_URL = "https://lh3.googleusercontent.com/aida-public/AB6AXuCWWij44s7K0qzxVRXFMn2rv8J7fzL8vIkuOI6Q0ThlZeNjDJnIXxFgSOAv13_WSKyLOB5UvtlAepuJTQRQxHFjoIdukYn8OZ7ah1ryxU4jGHHe8AfprceTn9ca729jzpKuKGF52CiSTL7rX-ErULZv1j0Fp_2f2K5hsti93D61NfrM_i7CUtTDL1OF6hjU_Y3S1s_DAvxGqpapgdAq4nqVJraM62C_43h9T1XV-R7ch6cnOogni7L46w";

// Clean state: all records must load ONLY from the real Supabase database
export const INITIAL_AGENTS: Agent[] = [];

export const INITIAL_PROCESSES: AuditProcess[] = [];

export const INITIAL_ACTIVITIES: ActivityItem[] = [];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_SUBMISSIONS: Submission[] = [];

export const INITIAL_SETTINGS = {
  orgName: 'ProcessHub Global Operations',
  passThreshold: 80,
  sev1SlaMinutes: 15,
  autoAssignNewHires: true,
  dailyQuizReminders: true,
  emailAlerts: true,
  accentTheme: 'indigo' as const
};
