import React, { useState, useEffect } from 'react';
import { LOGO_URL } from '../data/initialData';
import {
  signInUser,
  registerPrimaryAdmin,
  verifyPrimaryAdminOtp,
  resendVerificationOtp,
  getAdminCount,
} from '../services/supabaseService';
import { UserProfile } from '../types';

interface LoginViewProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'init-admin' | 'verify-otp'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyFullName, setVerifyFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showDevGuide, setShowDevGuide] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
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
          // If local storage has admin initialized or count > 0, always stay in signin
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

  // Cooldown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // If in OTP verification mode
    if (mode === 'verify-otp') {
      if (!otpCode.trim() || otpCode.trim().length < 6) {
        setErrorMessage('Please enter the 6-digit confirmation code from your email.');
        return;
      }

      setIsLoading(true);
      try {
        const res = await verifyPrimaryAdminOtp(verifyEmail || email, otpCode, verifyFullName || fullName);
        if (res.success && res.profile) {
          setSuccessMessage('Email verified & authenticated successfully! Launching ProcessHub...');
          setTimeout(() => {
            onLoginSuccess(res.profile!);
          }, 600);
        } else {
          setErrorMessage(res.error || 'Verification failed. Please check your code or request a new one.');
        }
      } catch (err: any) {
        setErrorMessage(err?.message || 'Verification failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
          }, 600);
        } else if (res.requiresEmailVerification) {
          setVerifyEmail(email.trim());
          setVerifyFullName(fullName.trim());
          setMode('verify-otp');
          setResendCooldown(60);
          if (res.isRateLimited) {
            setIsRateLimited(true);
            setShowDevGuide(true);
          }
          setSuccessMessage(
            res.error ||
              `A 6-digit verification code was sent to ${email.trim()}. Please enter it below to activate your account.`
          );
        } else {
          setErrorMessage(res.error || 'Failed to create Primary Admin.');
        }
      } else {
        const res = await signInUser(email, password);
        if (res.success && res.profile) {
          setSuccessMessage(`Welcome back, ${res.profile.fullName}! Authenticating...`);
          setTimeout(() => {
            onLoginSuccess(res.profile!);
          }, 500);
        } else if (res.requiresEmailVerification) {
          setVerifyEmail(email.trim());
          setMode('verify-otp');
          setResendCooldown(60);
          setShowDevGuide(true);
          setSuccessMessage(
            'Your account exists in Supabase Auth, but email confirmation is pending. Check below for instant resolution.'
          );
        } else {
          setErrorMessage(res.error || 'Invalid login credentials. Please check your email and password.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await resendVerificationOtp(verifyEmail || email);
      if (res.success) {
        setSuccessMessage('A fresh verification request has been dispatched to your email.');
        setResendCooldown(60);
      } else {
        if (res.isRateLimited) {
          setIsRateLimited(true);
          setShowDevGuide(true);
        }
        setErrorMessage(res.error || 'Failed to resend verification code.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCopySql = () => {
    const targetEmail = (verifyEmail || email || 'your.email@gmail.com').trim();
    const sql = `UPDATE auth.users SET email_confirmed_at = now() WHERE email = '${targetEmail}';`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
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
            <span>Supabase Auth &amp; RLS Live</span>
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

        {/* Mode Switcher Tabs (Only visible when 0 admins exist and not verifying OTP) */}
        {!checkingAdmins && adminCount === 0 && mode !== 'verify-otp' && (
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
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[18px] text-rose-400 flex-shrink-0">
              error
            </span>
            <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-200 ml-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* Success / Info Notification */}
        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <span className="material-symbols-outlined text-[18px] text-emerald-400 flex-shrink-0">
              check_circle
            </span>
            <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'verify-otp' ? (
            /* OTP Verification Screen */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-center">
                <span className="material-symbols-outlined text-3xl text-indigo-400 mb-1">
                  mark_email_read
                </span>
                <h3 className="text-sm font-bold text-white">Email Verification Required</h3>
                <p className="text-[11px] text-slate-300 mt-1">
                  Target Account: <strong className="text-indigo-300">{verifyEmail || email}</strong>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter the 6-digit code if received, or use the dev fast-track below if emails are rate-limited.
                </p>
              </div>

              {isRateLimited && (
                <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-400 flex-shrink-0 mt-0.5">
                    schedule
                  </span>
                  <div className="leading-relaxed">
                    <strong className="text-amber-300 font-semibold block">Supabase Free SMTP Rate Limit Reached</strong>
                    <span className="text-[11px] text-amber-200/90">
                      Supabase free projects limit built-in emails to 3-4/hr. Outgoing emails are blocked. Use the instant SQL command below to confirm your account in 3 seconds.
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center tracking-[0.4em] text-lg font-mono py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length < 6}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Verify Code &amp; Launch</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || isResending}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50 transition-colors"
                >
                  {isResending
                    ? 'Resending...'
                    : resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : 'Resend verification code'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <span>Sign in with password</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>

              {/* Dev Fast-Track & SQL Solution Card */}
              <div className="mt-4 pt-4 border-t border-slate-800/90">
                <button
                  type="button"
                  onClick={() => setShowDevGuide(!showDevGuide)}
                  className="w-full flex items-center justify-between text-left p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 transition-colors text-xs text-slate-300 font-semibold cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-indigo-300">
                    <span className="material-symbols-outlined text-[16px]">terminal</span>
                    <span>Development Instant Fix: No Email Delivered?</span>
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">
                    {showDevGuide ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {showDevGuide && (
                  <div className="mt-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] space-y-2.5 text-slate-300 animate-in fade-in duration-200">
                    <div>
                      <p className="font-bold text-white flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Method 1: Instant SQL Confirmation (Recommended)
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        Run this in your Supabase Dashboard &gt; SQL Editor to verify the email immediately:
                      </p>
                      <div className="mt-1.5 p-2 rounded-lg bg-slate-900 border border-slate-700/80 font-mono text-[10px] text-emerald-300 flex items-center justify-between gap-2">
                        <span className="truncate select-all">
                          UPDATE auth.users SET email_confirmed_at = now() WHERE email = &apos;{verifyEmail || email || 'your.email@gmail.com'}&apos;;
                        </span>
                        <button
                          type="button"
                          onClick={handleCopySql}
                          className="flex-shrink-0 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-sans font-bold flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {copiedSql ? 'check' : 'content_copy'}
                          </span>
                          <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80">
                      <p className="font-bold text-white flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Method 2: Disable Email Confirmations in Supabase
                      </p>
                      <p className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                        In Supabase Dashboard &rarr; <strong>Authentication</strong> &rarr; <strong>Providers</strong> &rarr; <strong>Email</strong>: toggle <strong>Confirm email</strong> to <strong>OFF</strong>, then click Save.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMode('signin');
                        setErrorMessage(null);
                        setSuccessMessage('Account confirmed? Enter your password to sign in.');
                      }}
                      className="w-full py-1.5 text-center font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg transition-colors text-[11px]"
                    >
                      I Ran the SQL / Disabled Confirm Email &rarr; Go to Sign In
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Standard Signin / Init-Admin Screen */
            <>
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
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      mode === 'init-admin'
                        ? 'admin@processhub.internal'
                        : 'your.email@processhub.internal'
                    }
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
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying with Supabase...</span>
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
            </>
          )}
        </form>

        {/* Security & Access Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-2">
          <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium">
            <span className="material-symbols-outlined text-[14px] text-indigo-400">
              shield
            </span>
            <span>Secured via Supabase Row Level Security</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {mode === 'init-admin'
              ? 'Once created, this primary admin account holds exclusive privileges to manage SOPs, calibrate audits, and provision agents.'
              : mode === 'verify-otp'
              ? 'Verification ensures only verified team members can initialize governance.'
              : 'Public user registration is disabled. Agents must use credentials provisioned by the Primary Admin.'}
          </p>
        </div>
      </div>
    </div>
  );
};
