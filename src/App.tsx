import React, { useState } from 'react';
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
import { applyPerformanceImport } from './utils/pdfPerformanceService';
import {
  INITIAL_PROCESSES,
  INITIAL_AGENTS,
  INITIAL_ACTIVITIES,
  INITIAL_NOTIFICATIONS,
  INITIAL_SUBMISSIONS,
  INITIAL_SETTINGS
} from './data/initialData';
import {
  AuditProcess,
  Agent,
  ActivityItem,
  NotificationItem,
  Submission,
  SystemSettings,
  PerformanceImportRow
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [userRole, setUserRole] = useState<'admin' | 'agent'>('admin');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [processes, setProcesses] = useState<AuditProcess[]>(INITIAL_PROCESSES);
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [settings, setSettings] = useState<SystemSettings>(INITIAL_SETTINGS);

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

  const currentAgent = agents.find((a) => a.id === currentAgentId) || agents[0];

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // Switch role between Admin and Agent
  const handleToggleRole = () => {
    const nextRole = userRole === 'admin' ? 'agent' : 'admin';
    setUserRole(nextRole);
    if (nextRole === 'agent') {
      setCurrentTab('dashboard');
    }
    showToast(
      `Switched to ${nextRole === 'admin' ? 'Admin Dashboard' : `Agent View (${currentAgent.name})`}`,
      'info'
    );
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

  const handleSaveDraft = (proc: AuditProcess) => {
    setProcesses((prev) => {
      const idx = prev.findIndex((p) => p.id === proc.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...proc, status: 'Draft', autoSavedText: 'Saved just now' };
        return updated;
      }
      return [proc, ...prev];
    });
    showToast(`Draft "${proc.title}" saved successfully!`);
  };

  const handlePublish = (proc: AuditProcess) => {
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

    showToast(`SOP Published to ${publishedProc.metrics?.totalAssigned} agents!`);
    setCurrentTab('updates');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ADMIN AGENT METRIC UPDATE
  const handleUpdateAgentPerformance = (
    agentId: string,
    updates: { qualityScore: number; fatalCount: number; callAuditCount: number }
  ) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, ...updates, score: updates.qualityScore } : a))
    );
    const targetAgent = agents.find((a) => a.id === agentId);
    showToast(
      `Saved: ${targetAgent?.name || 'Agent'} (Quality: ${updates.qualityScore}%, Fatals: ${updates.fatalCount}, Audits: ${updates.callAuditCount})`
    );
  };

  const handleUpdateAgent = (updatedAgent: Agent) => {
    setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
    showToast(
      `Saved: ${updatedAgent.name} (Quality: ${updatedAgent.qualityScore}%, Fatals: ${updatedAgent.fatalCount}, Audits: ${updatedAgent.callAuditCount})`
    );
  };

  // ADMIN IMPORT PERFORMANCE DATA FROM PDF
  const handleConfirmPerformanceImport = (rows: PerformanceImportRow[]) => {
    const { updatedAgents, importedCount } = applyPerformanceImport(rows, agents);
    setAgents(updatedAgents);

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

    showToast('Performance data imported successfully.');
  };

  // Record submission from ProcessDetailView or Quiz Modal
  const handleQuizSubmission = (
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
      submittedAt: 'Just now',
      answersSummary: {
        correct: answersDetail
          ? answersDetail.filter((a) => a.isCorrect).length
          : Math.round((percentage / 100) * process.quiz.questions.length),
        total: process.quiz.questions.length
      },
      answersDetail
    };

    setSubmissions([newSub, ...submissions]);

    // Update agent's completed process count
    setAgents((prev) =>
      prev.map((a) =>
        a.id === activeAgent.id
          ? { ...a, completedProcesses: (a.completedProcesses || 0) + 1 }
          : a
      )
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
    setActivities([newAct, ...activities]);

    showToast(`Submission certified: ${percentage}% scorecard generated!`);
  };

  const handleAddAgent = (newAgent: Agent) => {
    setAgents([newAgent, ...agents]);
    showToast(`Agent ${newAgent.name} added to roster!`);
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
    submissions.filter((s) => s.agentId === currentAgent.id).map((s) => s.processId)
  );

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
        />

        {/* Content Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-purple-50/20">
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
            />
          )}

          {/* COMBINED PROCESS DETAIL & KNOWLEDGE CHECK PAGE */}
          {currentTab === 'process-detail' && (
            <ProcessDetailView
              process={selectedProcessDetail || processes[0]}
              currentAgent={currentAgent}
              userRole={userRole}
              existingSubmission={submissions.find(
                (s) =>
                  s.processId === (selectedProcessDetail?.id || processes[0].id) &&
                  s.agentId === currentAgent.id
              )}
              onBack={() => handleTabChange('updates')}
              onSubmitQuiz={handleQuizSubmission}
            />
          )}

          {/* CREATE PROCESS TAB (Admin only) */}
          {currentTab === 'new-audit' && (
            <NewAuditView
              initialProcess={editingProcess || processes[0]}
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
            />
          )}

          {/* SUBMISSIONS TAB */}
          {currentTab === 'submissions' && (
            <SubmissionsView
              submissions={submissions}
              processes={processes}
              userRole={userRole}
              currentAgentId={currentAgent.id}
              onReviewSubmission={handleOpenProcessDetail}
            />
          )}

          {/* LEADERBOARD TAB */}
          {currentTab === 'leaderboard' && (
            <LeaderboardView
              agents={agents}
              submissions={submissions}
              processes={processes}
              currentAgentId={userRole === 'agent' ? currentAgent.id : undefined}
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
          currentAgent={currentAgent}
          existingSubmission={submissions.find(
            (s) => s.processId === activeQuizProcess.id && s.agentId === currentAgent.id
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
          onMarkAllRead={() => {
            setNotifications(notifications.map((n) => ({ ...n, read: true })));
            showToast('All notifications marked as read');
          }}
          onActionClick={(item) => {
            showToast(item.message, 'info');
            setIsNotificationsOpen(false);
          }}
        />
      )}

      {/* Profile Modal */}
      {isProfileOpen && <ProfileModal onClose={() => setIsProfileOpen(false)} />}

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
