import React, { useState } from 'react';
import { Agent } from '../types';

interface AgentsViewProps {
  agents: Agent[];
  onRemindAgent: (agent: Agent) => void;
  onOpenAddAgent: () => void;
  onOpenImportPerformance?: () => void;
  onUpdateAgentPerformance: (
    agentId: string,
    updates: { qualityScore: number; fatalCount: number; callAuditCount: number }
  ) => void;
  onToggleAgentStatus?: (agentId: string, newStatus: 'Active' | 'Inactive') => void;
}

export const AgentsView: React.FC<AgentsViewProps> = ({
  agents,
  onRemindAgent,
  onOpenAddAgent,
  onOpenImportPerformance,
  onUpdateAgentPerformance,
  onToggleAgentStatus
}) => {
  const [selectedTeam, setSelectedTeam] = useState<string>('All');
  const [search, setSearch] = useState<string>('');

  // Agent currently being edited in management modal
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [formQualityScore, setFormQualityScore] = useState<number>(90);
  const [formFatalCount, setFormFatalCount] = useState<number>(0);
  const [formCallAuditCount, setFormCallAuditCount] = useState<number>(30);
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');

  const teams = ['All', 'Escalations Squad', 'Customer Success', 'Billing Ops', 'Tier 1 Support'];

  const handleOpenEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setFormQualityScore(agent.qualityScore ?? agent.score ?? 90);
    setFormFatalCount(agent.fatalCount ?? 0);
    setFormCallAuditCount(agent.callAuditCount ?? 30);
    setFormStatus(agent.status === 'Inactive' ? 'Inactive' : 'Active');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    onUpdateAgentPerformance(editingAgent.id, {
      qualityScore: Number(formQualityScore),
      fatalCount: Number(formFatalCount),
      callAuditCount: Number(formCallAuditCount)
    });

    if (onToggleAgentStatus && formStatus !== editingAgent.status) {
      onToggleAgentStatus(editingAgent.id, formStatus);
    }

    setEditingAgent(null);
  };

  const filtered = agents.filter((a) => {
    if (selectedTeam !== 'All' && a.team !== selectedTeam) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-300">
      {/* Top Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Agent Performance Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              Admin Control
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manually calibrate and update Quality Scores, Fatal Counts, and Call Audit Counts for each
            agent.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {onOpenImportPerformance && (
            <button
              onClick={onOpenImportPerformance}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px] text-indigo-600">upload_file</span>
              <span>Import Performance Data</span>
            </button>
          )}

          <button
            onClick={() => {
              if (agents.length > 0) {
                const target = agents[0];
                setEditingAgent(target);
                setFormQualityScore(target.qualityScore ?? target.score ?? 85);
                setFormFatalCount(target.fatalCount ?? 0);
                setFormCallAuditCount(target.callAuditCount ?? 1);
                setFormStatus(target.status === 'Inactive' ? 'Inactive' : 'Active');
              }
            }}
            disabled={agents.length === 0}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 text-indigo-700 font-bold text-xs sm:text-sm flex items-center gap-2 border border-indigo-200 transition-all cursor-pointer shadow-xs"
            title="Update Quality Score & Calibrate Metrics"
          >
            <span className="material-symbols-outlined text-[20px] text-indigo-600">tune</span>
            <span>Update Quality Score</span>
          </button>

          <button
            onClick={onOpenAddAgent}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>Add New Agent</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Squad Size
            </span>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{agents.length}</p>
            <span className="text-xs text-emerald-600 font-semibold mt-0.5 block">
              100% active calibrated agents
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">groups</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Avg Quality Score
            </span>
            <p className="text-2xl sm:text-3xl font-black text-indigo-600 mt-1">
              {agents.length > 0
                ? (
                    agents.reduce((sum, a) => sum + (a.qualityScore ?? a.score ?? 0), 0) /
                    agents.length
                  ).toFixed(1)
                : '0.0'}
              %
            </p>
            <span className="text-xs text-indigo-500 font-semibold mt-0.5 block">
              Across all operational squads
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">verified</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Fatal Incidents
            </span>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
              {agents.reduce((sum, a) => sum + (a.fatalCount ?? 0), 0)}
            </p>
            <span className="text-xs text-rose-500 font-semibold mt-0.5 block">
              Total QA fatals this cycle
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[26px]">warning</span>
          </div>
        </div>
      </div>

      {/* Search & Team Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder="Search agents by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 text-xs sm:text-sm text-slate-800 outline-none border border-slate-200 focus:border-indigo-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar py-0.5">
          {teams.map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTeam(t)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedTeam === t
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Agent Cards Grid with Individual Management */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 p-8 shadow-xs">
            <span className="material-symbols-outlined text-5xl mb-3 text-slate-300">group_off</span>
            <p className="text-base font-semibold text-slate-700">No agents found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              {search || selectedTeam !== 'All'
                ? 'No agents match your filter or search query.'
                : 'Add an agent with Supabase account provisioning or import QA performance data.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={onOpenAddAgent}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                + Add First Agent
              </button>
              {onOpenImportPerformance && (
                <button
                  onClick={onOpenImportPerformance}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Import Performance Data
                </button>
              )}
            </div>
          </div>
        ) : (
          filtered.map((agent) => {
            const qScore = agent.qualityScore ?? agent.score ?? 0;
            const fCount = agent.fatalCount ?? 0;
            const cCount = agent.callAuditCount ?? 0;

          return (
            <div
              key={agent.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-indigo-500/50 hover:shadow-lg transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shadow-sm ${agent.colorClass}`}
                    >
                      {agent.initial}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-900">{agent.name}</h3>
                      <p className="text-xs text-slate-500">{agent.role}</p>
                      {agent.email && (
                        <p className="text-[11px] text-slate-400 font-medium truncate max-w-[180px]">{agent.email}</p>
                      )}
                      <span className="inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {agent.team}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                      #{agent.rank}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onToggleAgentStatus) {
                          onToggleAgentStatus(
                            agent.id,
                            agent.status === 'Active' ? 'Inactive' : 'Active'
                          );
                        }
                      }}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-all flex items-center gap-1 ${
                        agent.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-200/80 hover:bg-rose-100'
                      }`}
                      title={`Click to ${agent.status === 'Active' ? 'deactivate' : 'activate'} this agent account`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          agent.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <span>{agent.status === 'Active' ? 'Active' : 'Deactivated'}</span>
                    </button>
                  </div>
                </div>

                {/* 3 Core Calibrated Metrics Row */}
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Quality Score
                    </span>
                    <span
                      className={`font-black text-base ${
                        qScore >= 80 ? 'text-slate-900' : 'text-rose-600'
                      }`}
                    >
                      {qScore}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Fatal Count
                    </span>
                    <span
                      className={`font-black text-base ${
                        fCount === 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {fCount}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">
                      Call Audits
                    </span>
                    <span className="font-black text-slate-900 text-base">{cCount}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 truncate max-w-[130px]">
                  {agent.email}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(agent)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                    <span>Manage</span>
                  </button>

                  {agent.pendingQuizzes > 0 && (
                    <button
                      onClick={() => onRemindAgent(agent)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-700 text-xs font-bold transition-all cursor-pointer"
                      title="Dispatch Quiz Reminder"
                    >
                      <span className="material-symbols-outlined text-[15px]">send</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* INDIVIDUAL AGENT MANAGEMENT MODAL */}
      {editingAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-sm ${editingAgent.colorClass}`}
                >
                  {editingAgent.initial}
                </div>
                <div>
                  <h3 className="font-extrabold text-base">{editingAgent.name}</h3>
                  <p className="text-xs text-indigo-100">
                    {editingAgent.email ? `${editingAgent.email} • ` : ''}{editingAgent.team} • {editingAgent.role}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingAgent(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 font-medium">
                Admin Calibration: Any updates saved here will appear automatically on{' '}
                <strong>{editingAgent.name}</strong>'s personal dashboard.
              </div>

              {/* Agent Selection Dropdown */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Agent
                </label>
                <select
                  value={editingAgent.id}
                  onChange={(e) => {
                    const selected = agents.find((a) => a.id === e.target.value);
                    if (selected) {
                      setEditingAgent(selected);
                      setFormQualityScore(selected.qualityScore ?? selected.score ?? 85);
                      setFormFatalCount(selected.fatalCount ?? 0);
                      setFormCallAuditCount(selected.callAuditCount ?? 1);
                      setFormStatus(selected.status === 'Inactive' ? 'Inactive' : 'Active');
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  {agents.map((ag) => (
                    <option key={ag.id} value={ag.id}>
                      {ag.name} {ag.email ? `(${ag.email})` : ''}
                    </option>
                  ))}
                </select>
                {editingAgent.email && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Email: <span className="font-semibold text-slate-700">{editingAgent.email}</span>
                  </p>
                )}
              </div>

              {/* 1. Quality Score */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Quality Score (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formQualityScore}
                    onChange={(e) => setFormQualityScore(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-base outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                  <span className="absolute right-4 top-3 text-sm font-bold text-slate-400">%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Passing standard is 80% or above</p>
              </div>

              {/* 2. Fatal Count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Fatal Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="99"
                  required
                  value={formFatalCount}
                  onChange={(e) => setFormFatalCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-base outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  0 fatals indicates full zero-tolerance compliance
                </p>
              </div>

              {/* 3. Call Audit Count */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Call Audit Count
                </label>
                <input
                  type="number"
                  min="0"
                  max="999"
                  required
                  value={formCallAuditCount}
                  onChange={(e) => setFormCallAuditCount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-extrabold text-base outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Total phone and interaction audits conducted this cycle
                </p>
              </div>

              {/* 4. Account Authorization Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Account Login &amp; Authorization
                </label>
                <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormStatus('Active')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formStatus === 'Active'
                        ? 'bg-white text-emerald-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Active (Authorized)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('Inactive')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formStatus === 'Inactive'
                        ? 'bg-white text-rose-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Deactivated</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Deactivated agents cannot log into ProcessHub or view protected SOP materials.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAgent(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-xs font-bold shadow-md shadow-indigo-500/25 hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
