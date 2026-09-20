import React, { useState, useEffect } from 'react';
import { LOGO_URL } from '../data/initialData';
import {
  signInUser,
  registerPrimaryAdmin,
  getAdminCount,
} from '../services/supabaseService';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'init-admin'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [adminCount, setAdminCount] = useState<number | null>(null);
  const [checkingAdmins, setCheckingAdmins] = useState(true);

  // Check if primary admin exists on mount
  useEffect(() => {
    let isMounted = true;
    async function checkAdminStatus() {
      setCheckingAdmins(true);
      try {
        const count = await getAdminCount();
        if (isMounted) {
          setAdminCount(count);
          const localInit = typeof window !== 'undefined' ? localStorage.getItem('processhub_admin_initialized') : null;
          if (count === 0 && localInit !== 'true') {
            setMode('init-admin');
          } else {
            setMode('signin');
          }
        }
      } catch (err) {
        console.warn('Error checking admin count:', err);
      } finally {
        if (isMounted) setCheckingAdmins(false);
      }
    }
    checkAdminStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    if (mode === 'init-admin' && !fullName.trim()) {
      setErrorMessage('Please enter your full name for the primary administrator profile.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'init-admin') {
        const res = await registerPrimaryAdmin(email, password, fullName);
        if (res.success && res.profile) {
          setSuccessMessage('Primary Admin account created and authenticated successfully!');
          setTimeout(() => {
            onLoginSuccess(res.profile!);
          }, 500);
        } else {
          setErrorMessage(res.error || 'Failed to create Primary Admin account.');
        }
      } else {
        // Direct Agent / Admin login with Email and Password
        const res = await signInUser(email, password);
        if (res.success && res.profile) {
          setSuccessMessage(`Welcome back, ${res.profile.fullName}! Launching ProcessHub...`);
          setTimeout(() => {
            onLoginSuccess(res.profile!);
          }, 400);
        } else {
          setErrorMessage(
            res.error || 'Invalid email or password. Please verify your credentials and try again.'
          );
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSetupActive = !checkingAdmins && adminCount === 0 && mode === 'init-admin';

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Background Decorative Blur Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-gradient-to-tr from-indigo-600/20 via-violet-500/15 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3">
            <img
              src={LOGO_URL}
              alt="ProcessHub Logo"
              className="h-14 w-14 rounded-2xl object-contain shadow-lg ring-2 ring-indigo-500/30"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              ProcessHub
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-[11px] font-extrabold text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
              SaaS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            QA Operations &amp; Agent Enablement Suite
          </p>

          {/* Database Live Connectivity Badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Supabase Authentication</span>
          </div>
        </div>

        {/* First-time Admin Notification Banner */}
        {isSetupActive && (
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-amber-400 flex-shrink-0 mt-0.5">
              admin_panel_settings
            </span>
            <div>
              <p className="font-bold text-amber-200">First-Time Setup: Primary Admin</p>
              <p className="text-[11px] text-amber-300/80 mt-0.5 leading-relaxed">
                Configure your master administrator account to initialize ProcessHub governance.
              </p>
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs (Only visible when 0 admins exist) */}
        {!checkingAdmins && adminCount === 0 && (
          <div className="flex rounded-xl bg-slate-800/80 p-1 mb-5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('init-admin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'init-admin'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Primary Admin Setup
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div
            id="login-error-message"
            className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200"
          >
            <span className="material-symbols-outlined text-[18px] text-rose-400 flex-shrink-0 mt-0.5">
              error
            </span>
            <div className="flex-1 font-semibold leading-relaxed">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 ml-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Success / Info Notification */}
        {successMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[18px] text-emerald-400 flex-shrink-0 mt-0.5">
              check_circle
            </span>
            <div className="flex-1 font-semibold leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Direct Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'init-admin' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Administrator Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <span className="material-symbols-outlined text-[18px]">person</span>
                </span>
                <input
                  id="input-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jyoti Sharma"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Work Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <span className="material-symbols-outlined text-[18px]">mail</span>
              </span>
              <input
                id="input-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@processhub.internal"
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-300">
                Password
              </label>
              <span className="text-[11px] text-slate-400 font-medium">
                Min. 6 characters
              </span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </span>
              <input
                id="input-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-800/70 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
              />
              <button
                type="button"
                id="btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-login"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : mode === 'init-admin' ? (
              <>
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                <span>Create Primary Admin Account</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Sign In to Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Security & Access Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
            <span className="material-symbols-outlined text-[14px] text-indigo-400">
              shield
            </span>
            <span>Direct Email &amp; Password Authentication</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {mode === 'init-admin'
              ? 'Once created, this primary admin account holds exclusive privileges to manage SOPs, calibrate audits, and provision agents.'
              : 'Public user registration is disabled. Agents must use credentials provisioned by the Primary Admin.'}
          </p>
        </div>
      </div>
    </div>
  );
};
