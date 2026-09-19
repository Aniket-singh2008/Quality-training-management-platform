import React, { useState } from 'react';
import { Agent } from '../types';
import { createAgentAccountByAdmin } from '../services/supabaseService';

interface AddAgentModalProps {
  onClose: () => void;
  onAddAgent: (agent: Agent) => void;
}

export const AddAgentModal: React.FC<AddAgentModalProps> = ({ onClose, onAddAgent }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('AgentPass123!');
  const [team, setTeam] = useState('Escalations Squad');
  const [role, setRole] = useState('QA Support Associate');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    setStatusMessage('Registering agent in Supabase Auth & profiles...');

    const initial = name.trim().charAt(0).toUpperCase();
    let supabaseUserId = `ag-${Date.now()}`;

    try {
      const authRes = await createAgentAccountByAdmin(
        email.trim(),
        password.trim() || 'AgentPass123!',
        name.trim()
      );

      if (authRes.success && authRes.userId) {
        supabaseUserId = authRes.userId;
      }
    } catch (err) {
      console.warn('Agent auth registration note:', err);
    }

    const newAgent: Agent = {
      id: supabaseUserId,
      name: name.trim(),
      initial,
      colorClass: 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white',
      team,
      role,
      score: 88,
      qualityScore: 88,
      fatalCount: 0,
      callAuditCount: 20,
      pendingQuizzes: 1,
      completedProcesses: 1,
      rank: 9,
      status: 'Active',
      email: email.trim(),
    };

    onAddAgent(newAgent);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 text-[20px]">person_add</span>
            <h3 className="font-bold text-sm text-slate-800">Provision Agent Account</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Aniket Singh"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Work Email (Supabase Login) *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., aniket.singh@processhub.internal"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Login Password *
            </label>
            <input
              type="text"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Agent will sign in using this email and password.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Operational Squad
              </label>
              <select
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600 cursor-pointer"
              >
                <option value="Escalations Squad">Escalations Squad</option>
                <option value="Customer Success">Customer Success</option>
                <option value="Billing Ops">Billing Ops</option>
                <option value="Tier 1 Support">Tier 1 Support</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Role Title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., QA Specialist"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 outline-none focus:bg-white focus:border-indigo-600"
              />
            </div>
          </div>

          {statusMessage && (
            <p className="text-xs text-indigo-600 font-medium animate-pulse">
              {statusMessage}
            </p>
          )}

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <span>{isSubmitting ? 'Creating...' : 'Provision Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
