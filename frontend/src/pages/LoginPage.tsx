import React, { useState } from 'react';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import { login, register } from '../api/authApi';
import { ApiError } from '../api/client';
import { readQueryParam } from '../lib/url';

type Mode = 'login' | 'signup';

const DEMO_EMAIL = 'demo@peervault.local';
const DEMO_PASSWORD = 'demo-password-123';

/**
 * Real sign-in/sign-up, replacing the old "open devtools and paste an accessToken into
 * localStorage" dev workflow (see `../api-client.ts`'s original header comment). On success,
 * `../api/authApi.ts` already persists the session (`peervault_token` + refresh token + user) via
 * `../api/client.ts`'s `setSession()` — this component just triggers the call, shows errors, and
 * redirects to `/` once it resolves.
 */
export const LoginPage: React.FC = () => {
  const [mode, setMode] = useState<Mode>(() => (readQueryParam('mode') === 'signup' ? 'signup' : 'login'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState(() => (readQueryParam('demo') === '1' ? DEMO_EMAIL : ''));
  const [password, setPassword] = useState(() => (readQueryParam('demo') === '1' ? DEMO_PASSWORD : ''));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = readQueryParam('reason');

  const canSubmit =
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === 'login' || name.trim().length > 0) &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await register({ email: email.trim(), password, name: name.trim() });
      }
      window.location.assign('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the PeerVault backend. Is the mesh running?');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] flex items-center justify-center px-4 selection:bg-[#1A1A1A] selection:text-[#F9F8F6]">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8 space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 bg-[#1A1A1A] text-[#F9F8F6] border border-[#1A1A1A] mb-2">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="font-serif font-bold text-xl text-[#1A1A1A]">PeerVault Storage Mesh</h1>
          <p className="text-xs font-mono text-[#76746E] uppercase tracking-widest">Zero-Trust Control Plane</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#1A1A1A]/20 shadow-sm">

          {/* Mode toggle */}
          <div className="grid grid-cols-2 border-b border-[#1A1A1A]/20">
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`py-3 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                  mode === m
                    ? 'bg-[#1A1A1A] text-[#F9F8F6]'
                    : 'bg-[#F9F8F6] text-[#76746E] hover:text-[#1A1A1A]'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">

            {reason === 'unauthorized' && (
              <div className="flex items-start space-x-2 p-3 bg-[#F4F2EE] border border-[#1A1A1A]/15 text-[11px] text-[#5A5955]">
                <span>Your session ended or a protected page was requested directly. Please sign in again.</span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label htmlFor="login-name" className="block text-[10px] font-mono uppercase tracking-wider text-[#76746E]">
                  Name
                </label>
                <input
                  id="login-name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ada Lovelace"
                  className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-sm text-[#1A1A1A] placeholder:text-[#A8A59C] focus:outline-none focus:border-[#1A1A1A] transition-colors"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-[10px] font-mono uppercase tracking-wider text-[#76746E]">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-sm text-[#1A1A1A] placeholder:text-[#A8A59C] focus:outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-[10px] font-mono uppercase tracking-wider text-[#76746E]">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                className="w-full px-3 py-2 bg-[#F9F8F6] border border-[#1A1A1A]/20 text-sm text-[#1A1A1A] placeholder:text-[#A8A59C] focus:outline-none focus:border-[#1A1A1A] transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#1A1A1A] border border-rose-600 text-[#F9F8F6] text-[11px]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#333333] disabled:opacity-40 disabled:cursor-not-allowed text-[#F9F8F6] text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer border border-[#1A1A1A]"
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Log In' : 'Create Account'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#76746E] mt-6 font-mono">
          {mode === 'login' ? (
            <>No account yet? <button type="button" onClick={() => setMode('signup')} className="text-[#1A1A1A] underline cursor-pointer">Sign up</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => setMode('login')} className="text-[#1A1A1A] underline cursor-pointer">Log in</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
