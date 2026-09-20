import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { AgentDashboardView } from './components/AgentDashboardView';
import { NewAuditView } from './components/NewAuditView';
import { UpdatesView } from './components/UpdatesView';
import { AgentsView } from './components/AgentsView';
import { SubmissionsView } from './components/SubmissionsView';
import { LeaderboardView } from './components/LeaderboardView';
import { ProcessDetailView } from './components/ProcessDetailView';
import { AnalyticsView } from './components/AnalyticsView';
import { SettingsView } from './components/SettingsView';
import { QuizPreviewModal } from './components/QuizPreviewModal';
import { AddAgentModal } from './components/AddAgentModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ProfileModal } from './components/ProfileModal';
import { ImportPerformanceModal } from './components/ImportPerformanceModal';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { applyPerformanceImport } from './utils/pdfPerformanceService';
import { LoginView } from './components/LoginView';
import { supabase } from './lib/supabase';
import {
  checkSupabaseHealth,
  fetchProcessesFromSupabase,
  fetchAgentsFromSupabase,
  fetchSubmissionsFromSupabase,
  fetchNotificationsFromSupabase,
  broadcastProcessPublishNotification,
  markNotificationReadInSupabase,
  markAllNotificationsReadInSupabase,
  saveProcessUpdate,
  deleteProcessFromSupabase,
  saveAgent,
  saveSubmissionToSupabase,
  getCurrentSessionAndProfile,
  signOutUser,
  toggleAgentActiveStatus,
  SupabaseHealthStatus
} from './services/supabaseService';
import { INITIAL_SETTINGS } from './data/initialData';
import {
  AuditProcess,
  Agent,
  ActivityItem,
  NotificationItem,
  Submission,
  SystemSettings,
  PerformanceImportRow,
  UserProfile
} from './types';

export default function App() {
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<'admin' | 'agent'>('admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [processes, setProcesses] = useState<AuditProcess[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

  // Supabase connection & sync state
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseHealthStatus | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  // Active logged-in agent for Agent View
  const [currentAgentId, setCurrentAgentId] = useState<string>('ag-1');

  const [editingProcess, setEditingProcess] = useState<AuditProcess | null>(null);
  const [selectedProcessDetail, setSelectedProcessDetail] = useState<AuditProcess | null>(null);
  const [activeQuizProcess, setActiveQuizProcess] = useState<AuditProcess | null>(null);

  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const currentAgent =
    agents.find((a) => a.id === currentAgentId) ||
    agents[0] ||
    (currentProfile
      ? ({
          id: currentProfile.id,
          name: currentProfile.fullName || 'Agent',
          email: currentProfile.email,
          initial: (currentProfile.fullName || 'A').charAt(0).toUpperCase(),
          colorClass: 'bg-indigo-600',
          team: 'Voice Support'
        } as Agent)
      : undefined);

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Load data from Supabase backend
  const loadDataFromSupabase = useCallback(async () => {
    setIsLoadingSupabase(true);
    try {
      const health = await checkSupabaseHealth();
      setSupabaseStatus(health);

      if (health.tablesExist) {
        // Fetch processes (with questions)
        const fetchedProcs = await fetchProcessesFromSupabase();
        setProcesses(fetchedProcs || []);

        // Fetch agents
        const fetchedAgents = await fetchAgentsFromSupabase();
        setAgents(fetchedAgents || []);

        // Fetch submissions & scores
        const fetchedSubs = await fetchSubmissionsFromSupabase();
        setSubmissions(fetchedSubs || []);

        // Fetch notifications for agents and admins
        const fetchedNotifs = await fetchNotificationsFromSupabase();
        setNotifications(fetchedNotifs || []);
      }
    } catch (err) {
      console.error('Supabase synchronization error:', err);
    } finally {
      setIsLoadingSupabase(false);
    }
  }, []);

  // Supabase Auth & Session Verification Lifecycle
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const { profile } = await getCurrentSessionAndProfile();
        if (isMounted) {
          if (profile) {
            // Check if deactivated
            if (profile.isActive === false) {
              await signOutUser();
              setCurrentProfile(null);
              showToast('Your agent account is deactivated. Please contact your QA Lead.', 'info');
              return;
            }

            setCurrentProfile(profile);
            setUserRole(profile.role);
            if (profile.role === 'agent') {
              setCurrentTab('dashboard');
              setAgents((currAgents) => {
                const matched = currAgents.find(
                  (a) => a.id === profile.id || a.email.toLowerCase() === profile.email.toLowerCase()
                );
                if (matched) {
                  setCurrentAgentId(matched.id);
                }
                return currAgents;
              });
            }
          } else {
            setCurrentProfile(null);
          }
        }
      } catch (err) {
        console.warn('Auth session initial check error:', err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    }

    initSession();

    // Clean up Supabase auth hash/query if returning from confirmation link
    if (
      typeof window !== 'undefined' &&
      (window.location.hash.includes('access_token') || window.location.search.includes('code='))
    ) {
      setTimeout(() => {
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          // ignore
        }
      }, 1000);
    }

    // Subscribe to auth state updates
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT') {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('processhub_cached_profile');
        }
        setCurrentProfile(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { profile } = await getCurrentSessionAndProfile();
        if (profile && isMounted) {
          if (profile.isActive === false) {
            await signOutUser();
            setCurrentProfile(null);
            showToast('Account deactivated. Contact QA Lead.', 'info');
            return;
          }

          setCurrentProfile(profile);
          setUserRole(profile.role);
          if (profile.role === 'agent') {
            setCurrentTab('dashboard');
          }
        }
      }
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Load database entities when authenticated
  useEffect(() => {
    if (currentProfile) {
      loadDataFromSupabase();
    }
  }, [currentProfile, loadDataFromSupabase]);

  // Enforce role guard: agents cannot access admin tabs
  useEffect(() => {
    if (currentProfile?.role === 'agent') {
      const adminOnlyTabs = ['new-audit', 'agents', 'analytics', 'settings'];
      if (adminOnlyTabs.includes(currentTab)) {
        setCurrentTab('dashboard');
        showToast('Access restricted: Only QA Administrators can access management views.', 'info');
      }
    }
  }, [currentProfile, currentTab]);

  // Switch role between Admin and Agent (Permitted only for Primary Admin to preview Agent View)
  const handleToggleRole = () => {
    if (currentProfile?.role !== 'admin') {
      showToast('Access Denied: Only users with the Primary Admin role in Supabase profiles can access Admin Dashboard.', 'info');
      return;
    }

    const nextRole = userRole === 'admin' ? 'agent' : 'admin';
    setUserRole(nextRole);
    if (nextRole === 'agent') {
      setCurrentTab('dashboard');
    }
    showToast(
      `Switched to ${nextRole === 'admin' ? 'Admin Dashboard' : `Agent View (${currentAgent?.name || 'Agent'})`}`,
      'info'
    );
  };

  // Sign out user
  const handleSignOut = async () => {
    await signOutUser();
    setCurrentProfile(null);
    setUserRole('admin');
    setCurrentTab('dashboard');
    showToast('Signed out of ProcessHub.');
  };

  // Admin toggling an agent's active status
  const handleToggleAgentStatus = async (agentId: string, newStatus: 'Active' | 'Inactive') => {
    const isActive = newStatus === 'Active';
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: newStatus } : a))
    );

    const ok = await toggleAgentActiveStatus(agentId, isActive);
    if (ok) {
      showToast(`Agent account set to ${newStatus} in Supabase profiles.`);
    } else {
      showToast(`Agent account updated locally to ${newStatus}.`, 'info');
    }
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'new-audit') {
      const draft = processes.find((p) => p.id === 'proc-1') || processes[0];
      setEditingProcess(draft);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectProcess = (proc: AuditProcess) => {
    setEditingProcess(proc);
    setCurrentTab('new-audit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenProcessDetail = (proc: AuditProcess) => {
    setSelectedProcessDetail(proc);
    setCurrentTab('process-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveDraft = async (proc: AuditProcess) => {
    const draftProc: AuditProcess = { ...proc, status: 'Draft', autoSavedText: 'Saved just now' };
    setProcesses((prev) => {
      const idx = prev.findIndex((p) => p.id === proc.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = draftProc;
        return updated;
      }
      return [draftProc, ...prev];
    });

    showToast(`Saving draft "${proc.title}" to Supabase...`, 'info');
    const ok = await saveProcessUpdate(draftProc);
    if (ok) {
      showToast(`Draft "${proc.title}" saved to Supabase!`);
    } else {
      showToast(`Draft saved locally (check Supabase table status)`);
    }
  };

  const handlePublish = async (proc: AuditProcess) => {
    const publishedProc: AuditProcess = {
      ...proc,
      status: 'Published',
      metrics: {
        completionRate: 0,
        completedCount: 0,
        totalAssigned: proc.audience.type === 'all' ? 24 : proc.audience.assignedAgents.length,
        publishedDate: 'Today'
      }
    };

    setProcesses((prev) => {
      const idx = prev.findIndex((p) => p.id === proc.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = publishedProc;
        return updated;
      }
      return [publishedProc, ...prev];
    });

    const newActivity: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'quiz_completed',
      userName: 'Jyoti (QA Lead)',
      text: 'published',
      highlight: proc.title,
      scoreBadge: 'Live',
      timestamp: 'Just now'
    };
    setActivities([newActivity, ...activities]);

    showToast(`Publishing "${proc.title}" and quiz questions to Supabase...`, 'info');
    const ok = await saveProcessUpdate(publishedProc);
    if (ok) {
      showToast(`SOP & ${proc.quiz.questions.length} questions saved to Supabase!`);
    } else {
      showToast(`SOP Published to ${publishedProc.metrics?.totalAssigned} agents!`);
    }

    // Broadcast notifications to agents in Supabase
    broadcastProcessPublishNotification(
      publishedProc,
      publishedProc.audience.type === 'selected' ? publishedProc.audience.assignedAgents : undefined
    );
    setCurrentTab('updates');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteProcess = async (processId: string) => {
    setProcesses((prev) => prev.filter((p) => p.id !== processId));
    showToast('Deleting process from Supabase...', 'info');
    const ok = await deleteProcessFromSupabase(processId);
    if (ok) {
      showToast('Process deleted from Supabase successfully.');
    } else {
      showToast('Process deleted locally.');
    }
  };

  // ADMIN AGENT METRIC UPDATE
  const handleUpdateAgentPerformance = async (
    agentId: string,
    updates: { qualityScore: number; fatalCount: number; callAuditCount: number }
  ) => {
    // Requirement 9: Agents must NOT be able to modify their own scores
    if (userRole !== 'admin') {
      showToast('Permission denied: Agents cannot modify quality scores.', 'info');
      return;
    }

    const target = agents.find((a) => a.id === agentId);
    const updatedAgent: Agent | null = target
      ? { ...target, ...updates, score: updates.qualityScore, qualityScore: updates.qualityScore }
      : null;

    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, ...updates, score: updates.qualityScore } : a))
    );

    if (updatedAgent) {
      await saveAgent(updatedAgent);
    }

    showToast(
      `Saved: ${target?.name || 'Agent'} (Quality: ${updates.qualityScore}%, Fatals: ${updates.fatalCount}, Audits: ${updates.callAuditCount})`
    );
  };

  const handleUpdateAgent = async (updatedAgent: Agent) => {
    // Requirement 9: Agents must NOT be able to modify their own scores
    if (userRole !== 'admin') {
      showToast('Permission denied: Agents cannot modify quality scores.', 'info');
      return;
    }

    setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
    await saveAgent(updatedAgent);
    showToast(
      `Saved: ${updatedAgent.name} (Quality: ${updatedAgent.qualityScore}%, Fatals: ${updatedAgent.fatalCount}, Audits: ${updatedAgent.callAuditCount})`
    );
  };

  // ADMIN IMPORT PERFORMANCE DATA FROM PDF
  const handleConfirmPerformanceImport = (rows: PerformanceImportRow[]) => {
    const { updatedAgents, importedCount } = applyPerformanceImport(rows, agents);
    setAgents(updatedAgents);

    // Persist all calibrated agents to Supabase
    for (const ag of updatedAgents) {
      saveAgent(ag);
    }

    // Record activity in live operational audit stream
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      type: 'process_updated',
      userName: 'Jyoti (QA Lead)',
      text: 'imported performance data from PDF',
      highlight: `${importedCount} agents calibrated`,
      scoreBadge: 'Calibrated',
      timestamp: 'Just now'
    };
    setActivities((prev) => [newAct, ...prev]);

    showToast(`Performance data for ${importedCount} agents saved to Supabase.`);
  };

  // Record submission from ProcessDetailView or Quiz Modal
  const handleQuizSubmission = async (
    process: AuditProcess,
    percentage: number,
    earnedMarks: number,
    totalMarks: number,
    answersDetail?: Array<{
      questionId: string;
      questionText: string;
      selectedOptionId: string;
      selectedOptionText: string;
      correctOptionText: string;
      isCorrect: boolean;
      pointsEarned: number;
      pointsPossible: number;
    }>
  ) => {
    const activeAgent = currentAgent;
    const newSub: Submission = {
      id: `sub-${Date.now()}`,
      agentId: activeAgent.id,
      agentName: activeAgent.name,
      agentInitial: activeAgent.initial,
      agentColor: activeAgent.colorClass,
      team: activeAgent.team,
      processId: process.id,
      processTitle: process.title,
      score: earnedMarks,
      totalMarks,
      percentage,
      passed: percentage >= 80,
      submittedAt: new Date().toISOString(),
      answersSummary: {
        correct: answersDetail
          ? answersDetail.filter((a) => a.isCorrect).length
          : Math.round((percentage / 100) * process.quiz.questions.length),
        total: process.quiz.questions.length
      },
      answersDetail
    };

    setSubmissions((prev) => [newSub, ...prev]);

    // Update agent's completed process count
    const updatedAgent: Agent = {
      ...activeAgent,
      completedProcesses: (activeAgent.completedProcesses || 0) + 1,
      pendingQuizzes: Math.max(0, (activeAgent.pendingQuizzes || 1) - 1)
    };

    setAgents((prev) =>
      prev.map((a) => (a.id === activeAgent.id ? updatedAgent : a))
    );

    // Update process completion metrics
    const currentCompleted = process.metrics?.completedCount || 0;
    const totalAssigned = process.metrics?.totalAssigned || 12;
    const newCompletedCount = currentCompleted + 1;
    const newRate = Math.round((newCompletedCount / Math.max(1, totalAssigned)) * 100);

    const updatedProcess: AuditProcess = {
      ...process,
      metrics: {
        ...process.metrics,
        completedCount: newCompletedCount,
        totalAssigned,
        completionRate: newRate,
        publishedDate: process.metrics?.publishedDate || process.effectiveDate
      }
    };

    setProcesses((prev) =>
      prev.map((p) => (p.id === process.id ? updatedProcess : p))
    );

    // Update activity feed
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      type: percentage >= 90 ? 'high_score' : 'quiz_completed',
      userName: activeAgent.name,
      text: `scored ${percentage}% on`,
      highlight: process.title,
      scoreBadge: percentage >= 80 ? 'Certified ✓' : 'Completed',
      timestamp: 'Just now'
    };
    setActivities((prev) => [newAct, ...prev]);

    // Save submission and individual question user responses to Supabase
    saveSubmissionToSupabase(newSub).then((saved) => {
      if (saved) {
        showToast(`Submission & responses recorded in Supabase!`);
      }
    });

    // Save updated agent & process metrics to Supabase
    saveAgent(updatedAgent);
    saveProcessUpdate(updatedProcess);

    showToast(`Submission certified: ${percentage}% scorecard generated!`);
  };

  const handleAddAgent = async (newAgent: Agent) => {
    setAgents((prev) => [newAgent, ...prev]);
    saveAgent(newAgent);
    showToast(`Agent ${newAgent.name} saved to Supabase!`);
  };

  const handleResolveAlert = (alertId: string) => {
    setActivities((prev) =>
      prev.map((act) =>
        act.id === alertId
          ? {
              ...act,
              actionText: 'Dispatched ✓'
            }
          : act
      )
    );
    showToast('Reminder notifications dispatched to pending agents!', 'info');
  };

  const handleRemindAgent = (agent: Agent) => {
    showToast(`Quiz reminder dispatched to ${agent.name}!`, 'info');
  };

  const handleSaveSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    showToast('Platform preferences saved successfully!');
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Set of completed processes by current logged in agent
  const agentCompletedProcessIds = new Set(
    currentAgent
      ? submissions.filter((s) => s.agentId === currentAgent.id).map((s) => s.processId)
      : []
  );

  // AUTH GUARD: Display spinner while verifying existing Supabase session
  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-6 text-white selection:bg-indigo-500">
        <div className="w-12 h-12 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-4" />
        <h2 className="text-base font-bold text-white tracking-tight">ProcessHub QA</h2>
        <p className="text-xs text-slate-400 mt-1">Verifying Supabase authentication &amp; role credentials...</p>
      </div>
    );
  }

  // AUTH GUARD: Render Login / Primary Admin Registration if not logged in
  if (!currentProfile) {
    return (
      <LoginView
        onLoginSuccess={(profile) => {
          setCurrentProfile(profile);
          setUserRole(profile.role);
          if (profile.role === 'agent') {
            setCurrentTab('dashboard');
            setAgents((currAgents) => {
              const matched = currAgents.find(
                (a) => a.id === profile.id || a.email?.toLowerCase() === profile.email?.toLowerCase()
              );
              if (matched) {
                setCurrentAgentId(matched.id);
                return currAgents;
              }
              const initial = profile.fullName.trim().charAt(0).toUpperCase() || 'A';
              const createdAgent: Agent = {
                id: profile.id,
                agentCode: `AG-${profile.id.slice(0, 4).toUpperCase()}`,
                name: profile.fullName,
                initial,
                colorClass: 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white',
                team: 'Escalations Squad',
                role: 'QA Support Associate',
                score: 90,
                qualityScore: 90,
                fatalCount: 0,
                callAuditCount: 15,
                pendingQuizzes: 1,
                completedProcesses: 1,
                rank: 9,
                status: 'Active',
                email: profile.email,
              };
              setCurrentAgentId(profile.id);
              return [createdAgent, ...currAgents];
            });
          }
          loadDataFromSupabase();
          showToast(
            `Authenticated as ${profile.fullName} (${profile.role === 'admin' ? 'Primary Admin' : 'Agent'})`
          );
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 font-sans text-slate-800 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={handleTabChange}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        userRole={userRole}
        onToggleRole={handleToggleRole}
        currentAgent={currentAgent}
        unreadCount={unreadCount}
        profile={currentProfile}
        onSignOut={handleSignOut}
      />

      {/* Main Layout Area */}
      <div className="lg:pl-64 flex flex-col flex-1 min-h-screen">
        {/* Top Sticky Header */}
        <Header
          currentTab={currentTab}
          title={
            currentTab === 'new-audit'
              ? 'Create Process Audit'
              : currentTab === 'process-detail'
              ? 'SOP & Certification Quiz'
              : undefined
          }
          onBack={
            currentTab === 'new-audit' || currentTab === 'process-detail'
              ? () => handleTabChange('updates')
              : undefined
          }
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadCount={unreadCount}
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenSidebar={() => setSidebarOpen(true)}
          userRole={userRole}
          onToggleRole={handleToggleRole}
          onSearchClick={() => handleTabChange('updates')}
          agents={agents}
          currentAgentId={currentAgentId}
          onSelectCurrentAgent={(id) => {
            setCurrentAgentId(id);
            const found = agents.find((a) => a.id === id);
            showToast(`Switched active agent to ${found?.name || id}`);
          }}
          supabaseStatus={supabaseStatus}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
          profile={currentProfile}
          onSignOut={handleSignOut}
        />

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20">
          {/* Supabase Notice Banner if tables aren't set up yet */}
          {supabaseStatus && !supabaseStatus.tablesExist && !isBannerDismissed && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <div>
                  <span className="font-bold text-slate-800">Supabase Connected:</span>{' '}
                  <span className="text-slate-600">
                    Project <code className="bg-white/80 px-1.5 py-0.5 rounded text-emerald-700 font-mono">xxqdxzqdtrqzfoyvpenv</code> is active. Run the SQL schema once in your Supabase SQL Editor to enable persistent cloud storage.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer"
                >
                  View Schema & Setup
                </button>
                <button
                  onClick={() => setIsBannerDismissed(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
                  title="Dismiss banner"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {currentTab === 'dashboard' &&
            (userRole === 'admin' ? (
              <DashboardView
                processes={processes}
                activities={activities}
                agents={agents}
                submissions={submissions}
                onNavigate={handleTabChange}
                onSelectProcess={handleSelectProcess}
                onOpenProcessDetail={handleOpenProcessDetail}
                onResolveAlert={handleResolveAlert}
                onOpenAddAgent={() => setIsAddAgentOpen(true)}
                onOpenImportPerformance={() => setIsImportModalOpen(true)}
                onConfirmImportPerformance={handleConfirmPerformanceImport}
                onManageAgent={() => handleTabChange('agents')}
                onUpdateAgentPerformance={handleUpdateAgentPerformance}
              />
            ) : (
              <AgentDashboardView
                currentAgent={currentAgent}
                allAgents={agents}
                processes={processes}
                submissions={submissions}
                onOpenProcess={handleOpenProcessDetail}
                onNavigate={handleTabChange}
                onSwitchAgent={(id) => setCurrentAgentId(id)}
              />
            ))}

          {/* PROCESS UPDATES TAB */}
          {currentTab === 'updates' && (
            <UpdatesView
              processes={processes}
              userRole={userRole}
              completedProcessIds={agentCompletedProcessIds}
              onSelectProcess={handleSelectProcess}
              onNewAudit={() => handleTabChange('new-audit')}
              onOpenProcessDetail={handleOpenProcessDetail}
              onDeleteProcess={handleDeleteProcess}
            />
          )}

          {/* COMBINED PROCESS DETAIL & KNOWLEDGE CHECK PAGE */}
          {currentTab === 'process-detail' && (
            <ProcessDetailView
              process={selectedProcessDetail || processes[0]}
              currentAgent={currentAgent || ({} as Agent)}
              userRole={userRole}
              existingSubmission={submissions.find(
                (s) =>
                  s.processId === (selectedProcessDetail?.id || processes[0]?.id) &&
                  s.agentId === currentAgent?.id
              )}
              onBack={() => handleTabChange('updates')}
              onSubmitQuiz={handleQuizSubmission}
            />
          )}

          {/* CREATE PROCESS TAB (Admin only) */}
          {currentTab === 'new-audit' && (
            <NewAuditView
              initialProcess={editingProcess || processes[0] || undefined}
              allAgents={agents}
              onSaveDraft={handleSaveDraft}
              onPublish={handlePublish}
              onPreview={(p) => setActiveQuizProcess(p)}
              onBack={() => handleTabChange('dashboard')}
            />
          )}

          {/* AGENTS MANAGEMENT TAB (Admin only) */}
          {currentTab === 'agents' && (
            <AgentsView
              agents={agents}
              onUpdateAgentPerformance={handleUpdateAgentPerformance}
              onRemindAgent={handleRemindAgent}
              onOpenAddAgent={() => setIsAddAgentOpen(true)}
              onOpenImportPerformance={() => setIsImportModalOpen(true)}
              onToggleAgentStatus={handleToggleAgentStatus}
            />
          )}

          {/* SUBMISSIONS TAB */}
          {currentTab === 'submissions' && (
            <SubmissionsView
              submissions={submissions}
              processes={processes}
              userRole={userRole}
              currentAgentId={currentAgent?.id}
              onReviewSubmission={handleOpenProcessDetail}
            />
          )}

          {/* LEADERBOARD TAB */}
          {currentTab === 'leaderboard' && (
            <LeaderboardView
              agents={agents}
              submissions={submissions}
              processes={processes}
              currentAgentId={userRole === 'agent' ? currentAgent?.id : undefined}
              isAdmin={userRole === 'admin'}
              onUpdateAgentPerformance={handleUpdateAgentPerformance}
              onRemindAgent={handleRemindAgent}
            />
          )}

          {/* ANALYTICS TAB */}
          {currentTab === 'analytics' && <AnalyticsView />}

          {/* SETTINGS TAB */}
          {currentTab === 'settings' && (
            <SettingsView settings={settings} onSaveSettings={handleSaveSettings} />
          )}
        </main>
      </div>

      {/* Quiz Modal for quick preview/testing */}
      {activeQuizProcess && (
        <QuizPreviewModal
          process={activeQuizProcess}
          currentAgent={currentAgent || ({} as Agent)}
          existingSubmission={submissions.find(
            (s) => s.processId === activeQuizProcess.id && s.agentId === currentAgent?.id
          )}
          onClose={() => setActiveQuizProcess(null)}
          onQuizCompleted={(percentage, earned, total, details) => {
            handleQuizSubmission(activeQuizProcess, percentage, earned, total, details);
          }}
        />
      )}

      {/* Add Agent Modal */}
      {isAddAgentOpen && (
        <AddAgentModal
          onClose={() => setIsAddAgentOpen(false)}
          onAddAgent={handleAddAgent}
        />
      )}

      {/* Import Performance Data Modal (Admin only) */}
      {isImportModalOpen && userRole === 'admin' && (
        <ImportPerformanceModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          agents={agents}
          onConfirmImport={handleConfirmPerformanceImport}
          onViewLeaderboard={() => {
            setIsImportModalOpen(false);
            handleTabChange('leaderboard');
          }}
        />
      )}

      {/* Notifications Drawer/Modal */}
      {isNotificationsOpen && (
        <NotificationsModal
          notifications={notifications}
          onClose={() => setIsNotificationsOpen(false)}
          onMarkAllRead={async () => {
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            await markAllNotificationsReadInSupabase(currentProfile?.id);
            showToast('All notifications marked as read');
          }}
          onActionClick={async (item) => {
            setNotifications((prev) =>
              prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
            );
            await markNotificationReadInSupabase(item.id);
            showToast(item.message, 'info');
            setIsNotificationsOpen(false);
          }}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <ProfileModal
          profile={currentProfile}
          onClose={() => setIsProfileOpen(false)}
          onSignOut={() => {
            setIsProfileOpen(false);
            handleSignOut();
          }}
        />
      )}

      {/* Supabase Database Connection & Setup Modal */}
      {isSupabaseModalOpen && (
        <SupabaseStatusModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          status={supabaseStatus}
          isLoading={isLoadingSupabase}
          onRefreshHealth={loadDataFromSupabase}
          onDataSyncSuccess={() => {
            loadDataFromSupabase();
            showToast('Synchronized with Supabase!');
          }}
        />
      )}

      {/* Toast Feedback */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none px-4 w-full max-w-sm">
          <div
            className={`p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border ${
              toast.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-indigo-600 text-white border-indigo-500'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-400">
              check_circle
            </span>
            <span className="flex-1">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
